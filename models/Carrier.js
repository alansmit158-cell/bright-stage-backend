const mongoose = require('mongoose');

const CarrierSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    cin: { type: String, required: true }, // Identity Card Number
    phone: String,
    vehiclePlate: { type: String, required: true },
    vehicleModel: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

// Virtual for full name
CarrierSchema.virtual('name').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Carrier', CarrierSchema);
