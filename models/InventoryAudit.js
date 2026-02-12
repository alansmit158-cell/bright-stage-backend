const mongoose = require('mongoose');

const InventoryAuditSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Annual Audit 2026"
    type: {
        type: String,
        enum: ['6-Month', 'Annual', 'Spot Check'],
        default: 'Spot Check'
    },
    date: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Draft', 'Finalized'],
        default: 'Draft'
    },
    items: [{
        inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        systemQty: { type: Number, required: true }, // Snapshot of system qty at start
        countedQty: { type: Number, default: 0 }, // User entered value
        discrepancy: { type: Number, default: 0 }, // counted - system
        notes: String
    }],
    createdBy: { type: String, default: 'System Admin' }, // Placeholder for user
    finalizedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('InventoryAudit', InventoryAuditSchema);
