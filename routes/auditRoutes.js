const express = require('express');
const router = express.Router();
const InventoryAudit = require('../models/InventoryAudit');
const InventoryItem = require('../models/InventoryItem');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get All Audits
router.get('/', async (req, res) => {
    try {
        const audits = await InventoryAudit.find().sort({ createdAt: -1 });
        res.json(audits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Audit (Snapshot)
router.post('/', async (req, res) => {
    try {
        const allItems = await InventoryItem.find({});
        const auditItems = allItems.map(item => ({
            inventoryItem: item._id,
            systemQty: item.quantity,
            countedQty: item.quantity,
            discrepancy: 0
        }));

        const audit = new InventoryAudit({
            name: req.body.name || `Audit ${new Date().toLocaleDateString()}`,
            type: req.body.type || 'Spot Check',
            items: auditItems,
            status: 'Draft'
        });

        await audit.save();
        res.status(201).json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Audit by ID
router.get('/:id', async (req, res) => {
    try {
        const audit = await InventoryAudit.findById(req.params.id).populate('items.inventoryItem');
        if (!audit) return res.status(404).json({ error: "Audit not found" });
        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Audit
router.put('/:id', async (req, res) => {
    try {
        const { items, status } = req.body;
        const audit = await InventoryAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ error: "Audit not found" });

        if (items) {
            items.forEach(updateItem => {
                const docItem = audit.items.find(i => i._id.toString() === updateItem._id);
                if (docItem) {
                    docItem.countedQty = updateItem.countedQty;
                    docItem.discrepancy = updateItem.countedQty - docItem.systemQty;
                    docItem.notes = updateItem.notes;
                }
            });
        }

        if (status) audit.status = status;
        if (status === 'Finalized') audit.finalizedAt = new Date();

        await audit.save();
        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
