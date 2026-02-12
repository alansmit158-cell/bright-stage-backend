const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    reference: String, // Bank reference

    // Reconciliation Status
    status: {
        type: String,
        enum: ['Pending', 'Reconciled', 'Ignored'],
        default: 'Pending'
    },

    // Matched Item (Optional - could be Invoice or Expense)
    matchedModel: { type: String, enum: ['Invoice', 'Expense'] },
    matchedId: { type: mongoose.Schema.Types.ObjectId },

    rawLine: String // Store original CSV line for debug
}, { timestamps: true });

module.exports = mongoose.model('BankTransaction', BankTransactionSchema);
