const express = require('express');
const router = express.Router();
const MaintenanceTicket = require('../models/MaintenanceTicket');
const InventoryItem = require('../models/InventoryItem');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get All Tickets
router.get('/', async (req, res) => {
    try {
        const tickets = await MaintenanceTicket.find().populate('inventoryItem').sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Ticket
router.post('/', async (req, res) => {
    try {
        const ticket = new MaintenanceTicket(req.body);
        const savedTicket = await ticket.save();

        // Auto-update item state
        await InventoryItem.findByIdAndUpdate(req.body.inventoryItem, { state: 'à vérifier' });

        res.status(201).json(savedTicket);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Ticket
router.put('/:id', async (req, res) => {
    try {
        const updatedTicket = await MaintenanceTicket.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (req.body.status === 'Fixed') {
            await InventoryItem.findByIdAndUpdate(updatedTicket.inventoryItem, { state: 'Fonctionnel' });
            updatedTicket.dateResolved = new Date();
            await updatedTicket.save();
        }

        res.json(updatedTicket);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Resolve Ticket Alias
router.put('/:id/resolve', async (req, res) => {
    try {
        const ticket = await MaintenanceTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        ticket.status = 'Fixed';
        ticket.dateResolved = new Date();
        ticket.repairNotes = req.body.resolutionNotes || req.body.repairNotes || "Fixed";
        await ticket.save();

        const item = await InventoryItem.findById(ticket.inventoryItem);
        if (item) {
            item.state = 'Fonctionnel';
            await item.save();
        }

        res.json(ticket);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
