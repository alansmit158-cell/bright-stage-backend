const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const InventoryItem = require('../models/InventoryItem');
const MaintenanceTicket = require('../models/MaintenanceTicket');
const CompanySettings = require('../models/CompanySettings');
const PdfService = require('../services/PdfService');
const googleCalendarService = require('../services/GoogleCalendarService');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @typedef {import('express').Request & { user: { _id: any, role: string, username?: string, name: string } }} AuthRequest
 */

// Get All Projects
router.get('/', protect, async (/** @type {AuthRequest} */ req, res) => {
    try {
        let query = {};

        if (req.user.role === 'Site Manager') {
            query = {
                $or: [
                    { createdBy: req.user._id },
                    { assignedUsers: req.user._id }
                ]
            };
        }

        const projects = await Project.find(query)
            .populate('items.inventoryItem')
            .populate('clientId')
            .populate('createdBy', 'username name email')
            .populate('assignedUsers', 'name email');

        res.json(projects);
    } catch (err) {
        console.error("Error fetching projects:", err);
        res.status(500).json({ error: err.message });
    }
});

// Create Project
router.post('/', protect, authorize('Founder', 'Manager', 'Site Manager'), async (/** @type {AuthRequest} */ req, res) => {
    try {
        const projectData = {
            ...req.body,
            createdBy: req.user._id,
            createdByName: req.user.username || req.user.name || 'Unknown',
            isValidated: false
        };
        const newProject = new Project(projectData);
        const savedProject = await newProject.save();

        const populatedProject = await savedProject.populate('clientId');

        googleCalendarService.addProjectEvent(populatedProject)
            .then(() => console.log(`Project ${savedProject.eventName} synced to Google Calendar.`))
            .catch(err => console.error("Calendar Sync Failed:", err));

        res.status(201).json(savedProject);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Availability Check
router.post('/availability-check', async (req, res) => {
    try {
        const { startDate, endDate, siteAddress, excludeProjectId } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid dates' });
        }

        const query = {
            status: { $in: ['Confirmed', 'Pickup'] },
            $or: [
                { 'dates.start': { $lte: end }, 'dates.end': { $gte: start } }
            ]
        };

        if (excludeProjectId) {
            query._id = { $ne: excludeProjectId };
        }

        const overlappingProjects = await Project.find(query).populate('items.inventoryItem');

        const itemUsage = {};
        overlappingProjects.forEach(proj => {
            proj.items.forEach(item => {
                if (item.source === 'internal' && item.inventoryItem) {
                    const iid = item.inventoryItem._id.toString();
                    itemUsage[iid] = (itemUsage[iid] || 0) + (item.quantity || 0);
                }
            });
        });

        const allItems = await InventoryItem.find({});
        const itemAvailability = {};

        allItems.forEach(item => {
            let effectiveStock = item.quantity;
            effectiveStock -= (item.maintenanceQuantity || 0);

            const reserved = itemUsage[item._id.toString()] || 0;
            const available = Math.max(0, effectiveStock - reserved);
            itemAvailability[item._id.toString()] = {
                available,
                total: item.quantity,
                reserved
            };
        });

        const grandTunisKeywords = ['tunis', 'ariana', 'ben arous', 'manouba', 'carthage', 'marsa', 'gammarth', 'lac', 'soukra', 'mourouj', 'bardo'];
        const isGrandTunis = (addr) => {
            if (!addr) return false;
            const lower = addr.toLowerCase().replace('tunisia', '');
            return grandTunisKeywords.some(k => lower.includes(k));
        };
        const isNewProjectGrandTunis = isGrandTunis(siteAddress);

        const busyLogistics = {
            drivers: {},
            vehicles: {}
        };

        const targetDates = [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
        const uniqueTargetDates = [...new Set(targetDates)];

        overlappingProjects.forEach(proj => {
            if (!proj.transport) return;
            const pStart = proj.dates.start.toISOString().split('T')[0];
            const pEnd = proj.dates.end.toISOString().split('T')[0];

            [pStart, pEnd].forEach(busyDate => {
                if (uniqueTargetDates.includes(busyDate)) {
                    if (proj.transport.driverName) {
                        const dName = proj.transport.driverName;
                        if (!busyLogistics.drivers[dName]) busyLogistics.drivers[dName] = {};
                        if (!busyLogistics.drivers[dName][busyDate]) busyLogistics.drivers[dName][busyDate] = { count: 0, grandTunis: true };

                        busyLogistics.drivers[dName][busyDate].count++;
                        if (!isGrandTunis(proj.siteAddress)) {
                            busyLogistics.drivers[dName][busyDate].grandTunis = false;
                        }
                    }
                    if (proj.transport.vehiclePlate) {
                        const vKey = proj.transport.vehiclePlate || proj.transport.vehicleModel;
                        if (!busyLogistics.vehicles[vKey]) busyLogistics.vehicles[vKey] = {};
                        if (!busyLogistics.vehicles[vKey][busyDate]) busyLogistics.vehicles[vKey][busyDate] = { count: 0, grandTunis: true };

                        busyLogistics.vehicles[vKey][busyDate].count++;
                        if (!isGrandTunis(proj.siteAddress)) {
                            busyLogistics.vehicles[vKey][busyDate].grandTunis = false;
                        }
                    }
                }
            });
        });

        const unavailableUsers = [];
        overlappingProjects.forEach(proj => {
            if (proj.assignedUsers && proj.assignedUsers.length > 0) {
                proj.assignedUsers.forEach(uid => {
                    const userId = uid._id ? uid._id.toString() : uid.toString();
                    if (!unavailableUsers.includes(userId)) {
                        unavailableUsers.push(userId);
                    }
                });
            }
        });

        const restWarnings = [];
        try {
            const restThreshold = new Date(start.getTime() - (11 * 60 * 60 * 1000));
            const recentWork = await Attendance.find({
                checkOut: { $gt: restThreshold, $lt: start }
            }).populate('user', 'name');

            recentWork.forEach(att => {
                const uid = att.user._id.toString();
                if (!unavailableUsers.includes(uid)) {
                    const checkOutTime = new Date(att.checkOut).toLocaleTimeString();
                    restWarnings.push({
                        userId: uid,
                        reason: `Rest Violation: Worked until ${checkOutTime} on previous shift.`
                    });
                }
            });
        } catch (e) {
            console.error("Rest check failed", e);
        }

        const unavailableDrivers = [];
        const unavailableVehicles = [];

        Object.keys(busyLogistics.drivers).forEach(dName => {
            const days = busyLogistics.drivers[dName];
            let isBlocked = false;
            uniqueTargetDates.forEach(date => {
                if (days[date]) {
                    const dailyLoad = days[date].count;
                    const allGrandTunis = days[date].grandTunis;
                    if (dailyLoad >= 1) {
                        if (isNewProjectGrandTunis && allGrandTunis && dailyLoad < 3) {
                            // OK
                        } else {
                            isBlocked = true;
                        }
                    }
                }
            });
            if (isBlocked) unavailableDrivers.push(dName);
        });

        Object.keys(busyLogistics.vehicles).forEach(vKey => {
            const days = busyLogistics.vehicles[vKey];
            let isBlocked = false;
            uniqueTargetDates.forEach(date => {
                if (days[date]) {
                    const dailyLoad = days[date].count;
                    const allGrandTunis = days[date].grandTunis;
                    if (dailyLoad >= 1) {
                        if (isNewProjectGrandTunis && allGrandTunis && dailyLoad < 3) {
                            // OK
                        } else {
                            isBlocked = true;
                        }
                    }
                }
            });
            if (isBlocked) unavailableVehicles.push(vKey);
        });

        res.json({
            itemAvailability,
            unavailableDrivers,
            unavailableVehicles,
            unavailableUsers,
            restWarnings
        });
    } catch (err) {
        console.error("Availability Check Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Project by ID
router.get('/:id', protect, async (/** @type {AuthRequest} */ req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('items.inventoryItem');
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Project
router.put('/:id', protect, async (/** @type {AuthRequest} */ req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userRole = req.user.role;

        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const isLocked = project.permissions?.locked;
        const canBypassLock = ['Founder', 'Manager', 'Storekeeper'].includes(userRole);

        if (isLocked && !canBypassLock) {
            return res.status(403).json({ error: 'Project is LOCKED. Contact Manager/Founder to edit.' });
        }

        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };

        deepMerge(project, updates);
        await project.save();

        res.json(project);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Document Generation (Quote, Invoice, PrepList, Manifest, Transport, Transfer)
router.get('/:id/pdf', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('clientId');
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const type = req.query.type || 'quote';
        const companyId = String(req.query.companyId || 'bright');
        const settings = await CompanySettings.findOne({ companyKey: companyId });

        res.setHeader('Content-Type', 'application/pdf');

        switch (type) {
            case 'invoice':
                res.setHeader('Content-Disposition', `attachment; filename=FACTURE-${project.eventName || project._id}.pdf`);
                return PdfService.generateInvoice(project, res, companyId, settings);
            case 'preplist':
                res.setHeader('Content-Disposition', `attachment; filename=PREPLIST-${project.eventName || project._id}.pdf`);
                return PdfService.generatePrepList(project, res, companyId, settings);
            case 'manifest':
                res.setHeader('Content-Disposition', `attachment; filename=MANIFEST-${project.eventName || project._id}.pdf`);
                return PdfService.generateManifest(project, res, companyId, settings);
            case 'transport':
                res.setHeader('Content-Disposition', `attachment; filename=TRANSPORT-${project.eventName || project._id}.pdf`);
                return PdfService.generateTransportSlip(project, res, companyId, settings);
            case 'transfer':
                res.setHeader('Content-Disposition', `attachment; filename=TRANSFER-${project.eventName || project._id}.pdf`);
                return PdfService.generateTransferForm(project, res, companyId);
            default:
                res.setHeader('Content-Disposition', `attachment; filename=DEVIS-${project.eventName || project._id}.pdf`);
                return PdfService.generateQuote(project, res, companyId, settings);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validation & Logistics Workflow
router.post('/:id/lock', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        project.validationStatus = 'Pending';
        project.permissions.locked = true;
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/unlock', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        project.permissions.locked = false;
        project.permissions.unlockedBy = req.User._id;
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/validate', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        project.validationStatus = 'Validated';
        project.isValidated = true;
        project.status = 'Pickup';
        project.permissions.locked = true;
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/cancel-validation', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.status !== 'Confirmed' && project.status !== 'Draft' && project.status !== 'Pickup') {
            // Logic updated to be more flexible based on server.js 809 but safer
        }
        project.validationStatus = 'Draft';
        project.isValidated = false;
        if (project.logisticsStatus === 'ReadyForExit') project.logisticsStatus = 'Prep';
        project.exitQrCode = null;
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// QR & Logistics Scanning
router.post('/:id/qr/exit', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.validationStatus !== 'Validated') return res.status(400).json({ error: 'Project must be Validated first' });

        const qrToken = `EXIT-${project._id}-${Date.now()}`;
        project.exitQrCode = qrToken;
        project.logisticsStatus = 'ReadyForExit';
        await project.save();
        res.json({ qrCode: qrToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/scan/exit', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { qrCode } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.exitQrCode !== qrCode) return res.status(400).json({ error: 'Invalid QR Code' });

        project.logisticsStatus = 'OnSite';
        project.status = 'Pickup';
        project.exitScannedAt = new Date();
        project.exitScannedBy = req.user._id;
        project.exitQrCode = null;
        await project.save();
        res.json({ message: 'Exit Confirmed', project });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/qr/return', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const today = new Date();
        const returnDate = new Date(project.dates.end);
        today.setHours(0, 0, 0, 0);
        returnDate.setHours(0, 0, 0, 0);

        if (today < returnDate) return res.status(400).json({ error: "Cannot generate Return QR before the return date." });

        const qrToken = `RETURN-${project._id}-${Date.now()}`;
        project.returnQrCode = qrToken;
        project.logisticsStatus = 'Returning';
        await project.save();
        res.json({ qrCode: qrToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/scan/return', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { qrCode } = req.body;
        const project = await Project.findById(req.params.id).populate('items.inventoryItem');
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.returnQrCode !== qrCode) return res.status(400).json({ error: 'Invalid QR Code' });

        res.json({ message: 'Return QR Valid', project });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/return/finalize', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { missingItems, brokenItems, cleanReturn } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.returnReport = { missingItems, brokenItems, cleanReturn };
        project.logisticsStatus = 'Returned';
        project.status = 'Done';
        project.returnScannedAt = new Date();
        project.returnScannedBy = req.user._id;
        project.returnQrCode = null;

        const teamUserIds = [project.createdBy, ...(project.assignedUsers || [])];
        const uniqueTeamIds = [...new Set(teamUserIds.map(id => id.toString()))];

        for (const userId of uniqueTeamIds) {
            const teamMember = await User.findById(userId);
            if (!teamMember) continue;

            if (cleanReturn) {
                teamMember.points = (teamMember.points || 0) + 100;
                teamMember.pointsHistory.push({
                    reason: `Clean Return - Project ${project.eventName} (Team)`,
                    points: 100,
                    date: new Date()
                });
            } else if (missingItems && missingItems.length > 0) {
                teamMember.points = (teamMember.points || 0) - 100;
                teamMember.pointsHistory.push({
                    reason: `Missing Items - Project ${project.eventName} (Team)`,
                    points: -100,
                    date: new Date()
                });
            }
            await teamMember.save();
        }

        await project.save();
        res.json({ message: 'Return Finalized', pointsUpdated: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
