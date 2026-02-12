const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @typedef {import('express').Request & { user: import('../models/User') }} AuthRequest
 */

const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Expense = require('../models/Expense');
const Project = require('../models/Project'); // Added Project model

// Helper: Haversine Distance (in meters)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ1) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

// Helper: Shift Calculation (Regular vs Night)
function calculateShiftHours(checkIn, checkOut) {
    let current = new Date(checkIn);
    const end = new Date(checkOut);
    let regular = 0;
    let night = 0;

    while (current < end) {
        // Night hours: 21:00 (21) to 06:00 (6)
        const h = current.getHours();
        const isNight = (h >= 21 || h < 6);

        // Add 1 minute (or smaller increment for precision) - using 1 hour blocks for simplicity?, No, minutes.
        // Let's iterate by minutes for now? Or just check overlap.
        // Simple overlap logic:
        // Night intervals: [Yesterday 21:00, Today 06:00], [Today 21:00, Tomorrow 06:00]
        // This is complex to do iteratively.
        // Simplified approach: Iterate by hour? No, accuracy needed.
        // Let's assume for now just adding to counters based on start hour of the segment.
    }

    // Better Approach: Total Duration - Night Duration = Regular Duration.
    const durationMs = Number(end) - Number(checkIn);
    const totalHours = durationMs / (1000 * 60 * 60);

    // Calculate Night Duration
    // This is significant logic. For now, let's implement a basic version or Placeholder.
    // User requested "Automatiquement calculées entre 21h00 et 06h00".

    let nightMinutes = 0;
    let temp = new Date(checkIn);
    while (temp < end) {
        const h = temp.getHours();
        if (h >= 21 || h < 6) {
            nightMinutes++; // 1 minute resolution
        }
        temp.setMinutes(temp.getMinutes() + 1);
    }

    const nightHrs = nightMinutes / 60;
    const regularHrs = totalHours - nightHrs;

    return {
        total: parseFloat(totalHours.toFixed(2)),
        night: parseFloat(nightHrs.toFixed(2)),
        regular: parseFloat(regularHrs.toFixed(2))
    };
}

// --- ATTENDANCE ---

// Check-In (Clock In)
router.post('/attendance/check-in', protect, async (req, res) => {
    try {
        const { location, notes, project } = req.body; // location: { latitude, longitude, address }

        // Check if already checked in without check-out
        const existing = await Attendance.findOne({
            user: req.user._id,
            checkOut: { $exists: false }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already checked in. Please check out first.' });
        }

        const attendance = new Attendance({
            user: req.user._id,
            checkIn: new Date(),
            location,
            notes,
            project
        });

        // 1. Geofencing Check
        if (project) {
            const projectDoc = await Project.findById(project);
            if (projectDoc && projectDoc.location && projectDoc.location.latitude) {
                const dist = getDistance(
                    location.latitude, location.longitude,
                    projectDoc.location.latitude, projectDoc.location.longitude
                );
                const radius = projectDoc.location.radius || 200;

                if (dist > radius) {
                    return res.status(403).json({
                        error: `Geofence Violation: You are ${Math.round(dist)}m away. Max allowed: ${radius}m.`
                    });
                }
                // Determine Type based on Project if needed
            }
        }

        await attendance.save();
        res.status(201).json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check-Out (Clock Out)
router.post('/attendance/check-out', protect, async (req, res) => {
    try {
        const { location, notes } = req.body;

        // Find open session
        const attendance = await Attendance.findOne({
            user: req.user._id,
            checkOut: { $exists: false }
        });

        if (!attendance) {
            return res.status(400).json({ error: 'No active check-in found.' });
        }

        attendance.checkOut = new Date();
        // Optionally update location if tracking out-location distinct from in-location logic needed
        // For now, simpler to just close it. 
        if (notes) attendance.notes = (attendance.notes || '') + '\nCheckOut Note: ' + notes;

        // 2. Shift Calculation
        const { total, night, regular } = calculateShiftHours(attendance.checkIn, attendance.checkOut);

        attendance.totalHours = total;
        attendance.nightHours = night;
        attendance.regularHours = regular;

        // Simple Overtime Default (Manual rule: > 8 hours = overtime?)
        // Or if holiday? For now, if total > 8, remainder is overtime.
        if (regular > 8) {
            attendance.overtimeHours = parseFloat((regular - 8).toFixed(2));
            attendance.regularHours = 8;
        }

        attendance.status = 'Pending'; // Ready for manager approval
        await attendance.save();

        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get My Attendance
router.get('/attendance/me', protect, async (req, res) => {
    try {
        const records = await Attendance.find({ user: req.user._id })
            .sort({ checkIn: -1 })
            .limit(50);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Current Status
router.get('/attendance/status', protect, async (req, res) => {
    try {
        const current = await Attendance.findOne({
            user: req.user._id,
            checkOut: { $exists: false }
        });
        res.json({ isCheckedIn: !!current, currentSession: current });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Attendance (Manager Only)
router.get('/attendance', protect, authorize('Founder', 'Manager', 'Site Manager'), async (req, res) => {
    try {
        const records = await Attendance.find()
            .populate('user', 'name role')
            .sort({ checkIn: -1 })
            .limit(100);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- LEAVES ---

// Request Leave
router.post('/leaves', protect, async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;

        const leave = new LeaveRequest({
            user: req.user._id,
            type,
            startDate,
            endDate,
            reason
        });

        await leave.save();
        res.status(201).json(leave);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get My Leaves
router.get('/leaves/me', protect, async (req, res) => {
    try {
        const leaves = await LeaveRequest.find({ user: req.user._id }).sort({ startDate: -1 });
        res.json(leaves);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Leaves (Admin)
router.get('/leaves', protect, authorize('Founder', 'Manager', 'Site Manager'), async (req, res) => {
    try {
        const leaves = await LeaveRequest.find()
            .populate('user', 'name role')
            .sort({ startDate: -1 });
        res.json(leaves);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve/Reject Leave (Manager)
router.put('/leaves/:id/status', protect, authorize('Founder', 'Manager', 'Site Manager'), async (req, res) => {
    try {
        const { status } = req.body; // Approved, Rejected
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });

        leave.status = status;
        leave.approvedBy = req.user._id;
        leave.approvalDate = new Date();
        await leave.save();

        res.json(leave);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CONTRACTS ---

// Get All Contracts
router.get('/contracts', protect, authorize('Founder', 'Manager', 'Site Manager'), async (req, res) => {
    try {
        const contracts = await Contract.find().populate('user', 'name role');
        // Transform for frontend which expects flat salary
        const formatted = contracts.map(c => ({
            ...c.toObject(),
            salary: c.salary ? c.salary.amount : 0
        }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Contract
router.post('/contracts', protect, authorize('Founder', 'Manager', 'Site Manager'), async (req, res) => {
    try {
        const { user, type, startDate, endDate, salary, status } = req.body;

        const contract = new Contract({
            user,
            type,
            startDate,
            endDate,
            status: status || 'Active',
            salary: {
                amount: salary,
                currency: 'TND',
                frequency: 'Monthly'
            }
        });

        await contract.save();
        res.status(201).json(contract);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- EXPENSES ---

// Submit Expense
router.post('/expenses', protect, async (req, res) => {
    try {
        const { amount, description, category, receiptUrl } = req.body;
        const expense = new Expense({
            user: req.user._id,
            amount,
            description,
            category,
            receiptUrl
        });
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get My Expenses
router.get('/expenses/me', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Expenses (Admin Only)
router.get('/expenses', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        const expenses = await Expense.find()
            .populate('user', 'name role')
            .sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve/Reject Expense (Admin Only)
router.put('/expenses/:id/status', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });

        expense.status = status;
        expense.approvedBy = req.user._id;
        expense.approvalDate = new Date();
        if (rejectionReason) expense.rejectionReason = rejectionReason;

        await expense.save();
        res.json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
