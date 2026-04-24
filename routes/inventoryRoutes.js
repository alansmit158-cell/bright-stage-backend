const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const InventoryItem = require('../models/InventoryItem');
const Flycase = require('../models/Flycase');
const Project = require('../models/Project');
const MaintenanceTicket = require('../models/MaintenanceTicket');
const CompanySettings = require('../models/CompanySettings');
const PdfService = require('../services/PdfService');
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @typedef {import('express').Request & { user: { _id: any, role: string, name: string } }} AuthRequest
 */

// Export All QR Codes
router.get('/qr-export', protect, async (req, res) => {
    try {
        const items = await InventoryItem.find();
        const flycases = await Flycase.find().populate('equipment');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Global_QR_Codes.pdf');

        await PdfService.generateGlobalQrPdf(items, flycases, res);
    } catch (err) {
        console.error("QR Export Error", err);
        res.status(500).json({ error: err.message });
    }
});

// Get All Inventory
router.get('/', async (req, res) => {
    try {
        const items = await InventoryItem.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Inventory Item by Barcode
router.get('/barcode/:barcode', async (req, res) => {
    try {
        let item = await InventoryItem.findOne({ barcode: req.params.barcode });
        if (!item && mongoose.Types.ObjectId.isValid(req.params.barcode)) {
            item = await InventoryItem.findById(req.params.barcode);
        }
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Inventory Item
router.post('/', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const newItem = new InventoryItem(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Inventory Item
router.put('/:id', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const updatedItem = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete Inventory Item
router.delete('/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        await InventoryItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete All Inventory Items
router.delete('/all', protect, authorize('Founder'), async (req, res) => {
    try {
        await InventoryItem.deleteMany({});
        res.json({ message: 'All inventory items deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Report Issue
router.post('/:id/report-issue', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { quantity, issueDescription, severity, reportedBy } = req.body;
        const qtyToReport = parseInt(quantity);
        const itemId = req.params.id;

        if (!qtyToReport || qtyToReport <= 0) throw new Error("Invalid quantity");

        const originalItem = await InventoryItem.findById(itemId).session(session);
        if (!originalItem) throw new Error("Item not found");

        if (qtyToReport > originalItem.quantity) {
            throw new Error(`Cannot report ${qtyToReport}, only ${originalItem.quantity} in stock.`);
        }

        let targetItemId = originalItem._id;

        if (qtyToReport < originalItem.quantity) {
            originalItem.quantity -= qtyToReport;
            await originalItem.save({ session });

            const newItem = new InventoryItem({
                ...originalItem.toObject(),
                _id: new mongoose.Types.ObjectId(),
                quantity: qtyToReport,
                state: 'à réparer',
                barcode: `DMG-${originalItem.barcode || Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: `${originalItem.name} (Repair)`,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await newItem.save({ session });
            targetItemId = newItem._id;
        } else {
            originalItem.state = 'à réparer';
            await originalItem.save({ session });
        }

        const ticket = new MaintenanceTicket({
            inventoryItem: targetItemId,
            reportedBy: reportedBy || req.user.name,
            issueDescription: issueDescription,
            severity: severity || 'Medium',
            status: 'Open'
        });
        await ticket.save({ session });

        await session.commitTransaction();
        res.json({ message: "Issue reported successfully", ticket, targetItemId });
    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ error: err.message });
    } finally {
        session.endSession();
    }
});

// Check Availability
router.get('/availability', async (req, res) => {
    try {
        const { itemId, start, end } = req.query;
        if (!itemId || !start || !end) return res.status(400).json({ error: "Missing params" });

        const startDate = new Date(start);
        const endDate = new Date(end);

        const item = await InventoryItem.findById(itemId);
        if (!item) return res.status(404).json({ error: "Item not found" });

        if (item.state !== 'Fonctionnel') {
            return res.json({ available: 0, total: item.quantity, reserved: 0, status: item.state });
        }

        const projects = await Project.find({
            status: { $in: ['Confirmed', 'Pickup'] },
            $or: [
                { 'dates.start': { $lte: endDate }, 'dates.end': { $gte: startDate } }
            ],
            'items.inventoryItem': itemId
        });

        let reserved = 0;
        projects.forEach(p => {
            const lineItem = p.items.find(i => i.inventoryItem && i.inventoryItem.toString() === itemId);
            if (lineItem) reserved += (lineItem.quantity || 0);
        });

        const available = Math.max(0, item.quantity - reserved);

        res.json({
            available,
            total: item.quantity,
            reserved,
            status: item.state
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Inventory Item History
router.get('/:id/history', protect, async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await InventoryItem.findById(itemId);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const maintenance = await MaintenanceTicket.find({ inventoryItem: itemId }).sort({ createdAt: -1 });
        const rentals = await Project.find({
            'items.inventoryItem': itemId,
            status: { $in: ['Confirmed', 'Pickup', 'Return', 'Done'] }
        }).sort({ 'dates.start': -1 });

        const formattedRentals = rentals.map(p => {
            const projectItem = p.items.find(i => i.inventoryItem && i.inventoryItem.toString() === itemId);
            return {
                projectId: p._id,
                eventName: p.eventName,
                clientName: p.client?.name || 'Unknown',
                startDate: p.dates?.start,
                endDate: p.dates?.end,
                status: p.status,
                quantity: projectItem ? projectItem.quantity : 0
            };
        });

        res.json({
            item,
            maintenance,
            rentals: formattedRentals
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Excel Import
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let addedCount = 0;
        let updatedCount = 0;

        for (const row of data) {
            const name = row['Name'] || row['Nom'];
            if (!name) continue;

            const existingItem = await InventoryItem.findOne({
                name: name,
                model: row['Model'] || ''
            });

            const quantity = parseInt(row['Qty'] || row['Quantité'] || 0) || 0;

            if (existingItem) {
                existingItem.quantity += quantity;
                await existingItem.save();
                updatedCount++;
            } else {
                const newItem = new InventoryItem({
                    name: name,
                    brand: row['Brand'] || row['Marque'] || 'Generic',
                    model: row['Model'] || '',
                    category: row['Category'] || row['Catégorie'] || 'Accessoires structure',
                    quantity: quantity,
                    state: 'Fonctionnel',
                    barcode: row['Barcode'] || `GEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    storageLocation: {
                        zone: row['Zone'] || 'A',
                        shelving: row['Shelving'] || '1',
                        shelf: row['Shelf'] || '1'
                    }
                });
                await newItem.save();
                addedCount++;
            }
        }

        res.json({ message: 'Import successful', added: addedCount, updated: updatedCount });
    } catch (err) {
        console.error("Import error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Generate Structure Calc PDF
router.post('/structure-pdf', async (req, res) => {
    try {
        const { stats, config, company } = req.body;
        if (!stats || !config) return res.status(400).json({ error: "Missing config or stats" });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=STRUCTURE-CALC-${Date.now()}.pdf`);

        const companyId = company || 'bright';
        const settings = await CompanySettings.findOne({ companyKey: companyId });

        PdfService.generateStructureCalcPdf(stats, config, res, companyId, settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
