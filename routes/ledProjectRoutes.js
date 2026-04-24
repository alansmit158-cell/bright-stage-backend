const express = require('express');
const router = express.Router();
const LedProject = require('../models/LedProject');
const { calculateLedConfig } = require('../services/ledCalcService');

// 1. Calculate (Stateless - For Frontend Preview)
router.post('/calculate', (req, res) => {
    try {
        const { faceA, faceB, cabinetSpec, configType, screenElements } = req.body;

        const result = calculateLedConfig(
            cabinetSpec.width || 500,
            cabinetSpec.height || 500,
            cabinetSpec.pixelPitch || 2.6,
            cabinetSpec.weight || 8.5,
            cabinetSpec.maxPower || 120,
            faceA?.cols || 0,
            faceA?.rows || 0,
            faceB?.cols || 0,
            faceB?.rows || 0,
            configType || 'Flat',
            screenElements || []
        );

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Save Project
router.post('/', async (req, res) => {
    try {
        const { projectName, configType, faceA, faceB, screenElements, cabinetSpec, mounting } = req.body;

        // Auto-Calc Stats before save
        const calc = calculateLedConfig(
            cabinetSpec.width || 500,
            cabinetSpec.height || 500,
            cabinetSpec.pixelPitch || 2.6,
            cabinetSpec.weight || 8.5,
            cabinetSpec.maxPower || 120,
            faceA?.cols || 0,
            faceA?.rows || 0,
            faceB?.cols || 0,
            faceB?.rows || 0,
            configType || 'Flat',
            screenElements || []
        );

        const newProject = new LedProject({
            projectName,
            configType,
            faceA,
            faceB,
            screenElements,
            cabinetSpec,
            mounting,
            stats: {
                totalWidth: calc.dimensions.totalWidth_mm,
                totalHeight: calc.dimensions.totalHeight_mm || calc.dimensions.faceA_mm.h,
                totalResolutionW: calc.resolution.totalW,
                totalResolutionH: calc.resolution.totalH,
                totalWeight: calc.hardware.totalWeightKg,
                totalPower: calc.hardware.totalPowerW
            }
        });

        const saved = await newProject.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get All
router.get('/', async (req, res) => {
    try {
        const projects = await LedProject.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get One
router.get('/:id', async (req, res) => {
    try {
        const project = await LedProject.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
