const express = require('express');
const router = express.Router();
const DeliveryNote = require('../models/DeliveryNote');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/authMiddleware');

// Middleware to check Project Access
const checkProjectAccess = async (req, res, next) => {
    try {
        if (['Founder', 'Manager'].includes(req.user.role)) {
            return next();
        }

        const deliveryNoteId = req.params.id;
        let projectId = req.body.project;

        // If checking existing BL, get project from ID
        if (deliveryNoteId) {
            const note = await DeliveryNote.findById(deliveryNoteId);
            if (!note) return res.status(404).json({ error: 'Delivery Note not found' });
            projectId = note.project;
        }

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID required' });
        }

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Check if Site Manager is in assignedUsers or is the assigned site manager
        // Note: Project model has `assignedUsers` array of ObjectIds
        const isAssigned = project.assignedUsers && project.assignedUsers.some(
            id => id.toString() === req.user._id.toString()
        );

        if (req.user.role === 'Site Manager' && isAssigned) {
            return next();
        }

        res.status(403).json({ error: 'Not authorized for this project' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET All (Filtered)
router.get('/', protect, async (req, res) => {
    try {
        let query = {};

        // Filter for Site Managers
        if (req.user.role === 'Site Manager') {
            // Find projects assigned to this user
            const projects = await Project.find({ assignedUsers: req.user._id }).select('_id');
            query.project = { $in: projects.map(p => p._id) };
        } else if (!['Founder', 'Manager', 'Storekeeper'].includes(req.user.role)) {
            // Basic workers shouldn't see this probably, but sticking to spec
            return res.status(403).json({ error: 'Not authorized' });
        }

        const notes = await DeliveryNote.find(query)
            .populate('project', 'eventName siteName')
            .populate('carrier', 'firstName lastName vehiclePlate')
            .populate('createdBy', 'name')
            .sort({ date: -1 });

        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Single
router.get('/:id', protect, checkProjectAccess, async (req, res) => {
    try {
        const note = await DeliveryNote.findById(req.params.id)
            .populate('project')
            .populate('carrier');
        res.json(note);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post('/', protect, checkProjectAccess, async (req, res) => {
    try {
        const newNote = new DeliveryNote({
            ...req.body,
            createdBy: req.user._id
        });
        const saved = await newNote.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', protect, checkProjectAccess, async (req, res) => {
    try {
        const updated = await DeliveryNote.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', protect, checkProjectAccess, async (req, res) => {
    try {
        await DeliveryNote.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
