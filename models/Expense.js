const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'TND' },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['Food', 'Transport', 'Accommodation', 'Equipment', 'Other'],
        default: 'Other'
    },
    receiptUrl: String, // URL to image/pdf
    date: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
