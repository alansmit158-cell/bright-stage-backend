const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET All
router.get('/', async (req, res) => {
    try {
        const drivers = await Driver.find().sort({ name: 1 });
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post('/', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const newDriver = new Driver(req.body);
        const saved = await newDriver.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const updated = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        await Driver.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
