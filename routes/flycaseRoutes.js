const express = require('express');
const router = express.Router();
const flycaseController = require('../controllers/flycaseController');

// @route   POST api/flycases/create-equipment
// @desc    Create Equipment & Auto-Generate 6 Flycases
// @access  Private (Admin)
router.post('/create-equipment', flycaseController.createEquipmentWithFlycases);

// @route   GET api/flycases/:qrCodeID
// @desc    Get Flycase details by QR Code
// @access  Public (Staff)
router.get('/:qrCodeID', flycaseController.getFlycaseByQR);

// @route   PUT api/flycases/:qrCodeID/status
// @desc    Update Status (Available <-> In Use)
// @access  Private (Staff)
router.put('/:qrCodeID/status', flycaseController.toggleFlycaseStatus);

module.exports = router;
