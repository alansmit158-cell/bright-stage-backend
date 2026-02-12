const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['Cash', 'Check', 'Bank Transfer', 'Card', 'Other'], default: 'Bank Transfer' },
    reference: String, // Check Number, Trans ID
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },

    // Allocations (Lettrage)
    allocations: [{
        invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        amount: Number
    }],

    unallocatedAmount: { type: Number, default: 0 },

    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
