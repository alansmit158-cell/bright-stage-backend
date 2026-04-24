const express = require('express');
const router = express.Router();
const DeliveryNote = require('../models/DeliveryNote');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/authMiddleware');

// Middleware to check Project Access
/**
 * @param {import('express').Request & {user: any}} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
const checkProjectAccess = async (req, res, next) => {
    try {
        if (['Founder', 'Manager'].includes(req.user.role)) {
            return next();
        }

        const deliveryNoteId = req.params.id;
        let projectId = req.body.project;
        let isIndividual = req.body.isIndividual;

        // If checking existing BL, get project/status from ID
        if (deliveryNoteId) {
            const note = await DeliveryNote.findById(deliveryNoteId);
            if (!note) return res.status(404).json({ error: 'Delivery Note not found' });
            projectId = note.project;
            isIndividual = note.isIndividual;

            // Site Managers can access their own individual notes
            if (isIndividual && note.createdBy.toString() === req.user._id.toString()) {
                return next();
            }
        } else if (isIndividual) {
            // For creating new individual notes
            return next();
        }

        if (!projectId && !isIndividual) {
            return res.status(400).json({ error: 'Project ID required for non-individual notes' });
        }

        // Skip project check if it's an individual note without a project
        if (projectId) {
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
        }

        return res.status(403).json({ error: 'Not authorized for this delivery note or project' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// GET All (Filtered)
router.get('/', protect, 
    /** 
     * @param {import('express').Request & {user: any}} req 
     * @param {import('express').Response} res 
     */
    async (req, res) => {
    try {
        let query = {};

        // Filter for Site Managers
        if (req.user.role === 'Site Manager') {
            // Find projects assigned to this user
            const projects = await Project.find({ assignedUsers: req.user._id }).select('_id');

            // Can see notes for assigned projects OR individual notes created by them
            query = {
                $or: [
                    { project: { $in: projects.map(p => p._id) } },
                    { isIndividual: true, createdBy: req.user._id }
                ]
            };
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
router.post('/', protect, checkProjectAccess, 
    /** 
     * @param {import('express').Request & {user: any}} req 
     * @param {import('express').Response} res 
     */
    async (req, res) => {
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

// PDF Generation
router.get('/:id/pdf', protect, checkProjectAccess, 
    /** 
     * @param {import('express').Request & {user: any}} req 
     * @param {import('express').Response} res 
     */
    async (req, res) => {
    try {
        const note = await DeliveryNote.findById(req.params.id)
            .populate('project')
            .populate('carrier');

        if (!note) return res.status(404).json({ error: 'Delivery Note not found' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${note.number}.pdf`);

        const companyId = String(req.query.company || 'bright');
        const CompanySettings = require('../models/CompanySettings');
        const settings = await CompanySettings.findOne({ companyKey: companyId });

        const PdfService = require('../services/PdfService');
        // PdfService already handles null note.project safely using optional chaining
        PdfService.generateDeliveryNote(note, res, companyId, settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
