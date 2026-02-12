const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cin: String, // Identity Card Number
    licenseNumber: { type: String, required: true },
    phone: String,
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
