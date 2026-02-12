const mongoose = require('mongoose');

const SubcontractedItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    category: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    costPerDay: { type: Number, default: 0 },
    provider: { type: String }, // Who we rent it from
    notes: { type: String },
    isBought: { type: Boolean, default: false } // Flag to track if it's being "moved" to internal stock
}, { timestamps: true });

module.exports = mongoose.model('SubcontractedItem', SubcontractedItemSchema);
