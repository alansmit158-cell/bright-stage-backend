const mongoose = require('mongoose');

const LeaveRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['Vacation', 'Sick', 'Personal', 'Unpaid', 'Other'],
        default: 'Vacation'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: String,
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', LeaveRequestSchema);
