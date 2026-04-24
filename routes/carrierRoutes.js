const express = require('express');
const router = express.Router();
const Carrier = require('../models/Carrier');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET All Carriers
router.get('/', async (req, res) => {
    try {
        const carriers = await Carrier.find().sort({ firstName: 1, lastName: 1 });
        res.json(carriers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE Carrier
router.post('/', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const newCarrier = new Carrier(req.body);
        const saved = await newCarrier.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE Carrier
router.put('/:id', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const updated = await Carrier.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE Carrier
router.delete('/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        await Carrier.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
