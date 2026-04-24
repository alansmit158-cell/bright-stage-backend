const mongoose = require('mongoose');

const LossReportSchema = new mongoose.Schema({
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Project where it was lost
    responsiblePerson: { type: String, required: true }, // Name of staff

    lossValuation: { type: Number, required: true }, // Cost to deduct or track
    reason: { type: String }, // "Lost on site", "Stolen", "Damaged beyond repair"

    isPaid: { type: Boolean, default: false }, // If deducted from bonus/salary
    dateReported: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('LossReport', LossReportSchema);
