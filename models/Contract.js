const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['CDI', 'CDD', 'Freelance', 'Internship'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: Date, // Null for CDI
    documentUrl: String, // Link to PDF in generic storage or GridFS (future)
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Terminated'],
        default: 'Active'
    },
    salary: {
        amount: Number,
        currency: { type: String, default: 'TND' },
        frequency: { type: String, enum: ['Hourly', 'Daily', 'Monthly'], default: 'Monthly' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Contract', ContractSchema);
