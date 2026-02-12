const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    specs: { type: Object }, // Flexible for technical details (weight, power, etc)
}, { timestamps: true });

module.exports = mongoose.model('Equipment', EquipmentSchema);
