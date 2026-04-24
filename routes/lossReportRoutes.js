const express = require('express');
const router = express.Router();
const LossReport = require('../models/LossReport');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get All Loss Reports
router.get('/', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        const reports = await LossReport.find()
            .populate('inventoryItem', 'name model brand')
            .populate('project', 'name client')
            .sort({ dateReported: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Loss Report
router.post('/', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const report = new LossReport(req.body);
        await report.save();
        res.status(201).json(report);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
