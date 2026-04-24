const express = require('express');
const router = express.Router();
const Freelancer = require('../models/Freelancer');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all freelancers
router.get('/', async (req, res) => {
    try {
        const freelancers = await Freelancer.find().sort({ name: 1 });
        res.json(freelancers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a freelancer
router.post('/', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    const freelancer = new Freelancer(req.body);
    try {
        const newFreelancer = await freelancer.save();
        res.status(201).json(newFreelancer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a freelancer
router.put('/:id', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const updatedFreelancer = await Freelancer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedFreelancer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a freelancer
router.delete('/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        await Freelancer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Freelancer deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
