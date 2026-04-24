const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transfer = require('../models/Transfer');
const Project = require('../models/Project');
const PdfService = require('../services/PdfService');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get All Transfers
router.get('/', protect, async (req, res) => {
    try {
        const transfers = await Transfer.find()
            .sort({ createdAt: -1 })
            .populate('sourceProject', 'eventName')
            .populate('destinationProject', 'eventName')
            .populate('items.inventoryItem', 'name model');
        res.json(transfers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Transfer
router.post('/', protect, async (req, res) => {
    const { sourceProjectId, destProjectId, items, driverName, vehiclePlate, senderSig, receiverSig } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transfer = new Transfer({
            sourceProject: sourceProjectId,
            destinationProject: destProjectId,
            items,
            driverName,
            vehiclePlate,
            senderSignature: senderSig,
            receiverSignature: receiverSig
        });
        await transfer.save({ session });

        const sourceProj = await Project.findById(sourceProjectId).session(session);
        if (!sourceProj) throw new Error("Source Project not found");

        for (const tItem of items) {
            const existingItem = sourceProj.items.find(i => i.inventoryItem.toString() === tItem.inventoryItem);
            if (existingItem) {
                if (existingItem.quantity < tItem.quantity) throw new Error(`Not enough ${tItem.name} in source project`);
                existingItem.quantity -= tItem.quantity;
            }
        }
        await sourceProj.save({ session });

        const destProj = await Project.findById(destProjectId).session(session);
        if (!destProj) throw new Error("Destination Project not found");

        for (const tItem of items) {
            const existingItem = destProj.items.find(i => i.inventoryItem.toString() === tItem.inventoryItem);
            if (existingItem) {
                existingItem.quantity += parseInt(tItem.quantity);
            } else {
                destProj.items.push({
                    inventoryItem: tItem.inventoryItem,
                    name: tItem.name,
                    quantity: parseInt(tItem.quantity),
                    pricePerDay: 0
                });
            }
        }
        await destProj.save({ session });

        await session.commitTransaction();
        session.endSession();
        res.status(201).json(transfer);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: err.message });
    }
});

// Generate Transfer PDF
router.get('/:id/pdf', protect, async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id)
            .populate('sourceProject', 'eventName')
            .populate('destinationProject', 'eventName');
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

        const data = {
            sourceProjectName: transfer.sourceProject?.eventName || 'Unknown Source',
            destProjectName: transfer.destinationProject?.eventName || 'Unknown Destination',
            driverName: transfer.driverName,
            vehiclePlate: transfer.vehiclePlate,
            items: transfer.items,
            date: transfer.createdAt
        };

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transfer-${transfer._id}.pdf`);
        PdfService.generateInterSiteTransfer(data, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// On-the-fly Transfer PDF from Form
router.post('/pdf', async (req, res) => {
    try {
        const data = req.body;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transfer-slip.pdf`);
        PdfService.generateInterSiteTransfer(data, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
