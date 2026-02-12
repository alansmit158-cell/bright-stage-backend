const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
    plateNumber: { type: String, required: true, unique: true },
    model: String,
    type: { type: String, enum: ['Truck', 'Van', 'Car'], default: 'Truck' },
    capacityWeight: Number, // In Kg
    status: { type: String, enum: ['Active', 'Maintenance', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
