const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all clients - Accessible by all roles except Worker (maybe? or Worker needs it for schedule?)
// Let's allow everyone to SEE clients for now, or restrict. 
// Matrix says Storekeeper/SiteManager are Read Only.
router.get('/', protect, authorize('Founder', 'Manager', 'Storekeeper', 'Site Manager', 'Worker'), async (req, res) => {
    try {
        const clients = await Client.find().sort({ name: 1 });
        res.json(clients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create - Founder, Manager
router.post('/', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const newClient = new Client(req.body);
        const savedClient = await newClient.save();
        res.status(201).json(savedClient);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update - Founder, Manager
router.put('/:id', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedClient);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete - Founder, Manager
router.delete('/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        res.json({ message: 'Client deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
