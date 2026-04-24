const mongoose = require('mongoose');

const FreelancerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true }, // e.g., Sound, Light, Stagehand
    dailyRate: { type: Number, required: true },
    phone: String,
    email: String,
    cin: String, // Identity Card Number
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Freelancer', FreelancerSchema);
