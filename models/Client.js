const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Company Name or Full Name
    customId: String, // CUS-XX
    type: {
        type: String,
        enum: ['Société', 'Particulier', 'Association', 'Public'],
        default: 'Société'
    },
    matriculeFiscal: String, // Tax ID (MF)
    email: String,
    phone: String,
    address: String,
    address: String,
    city: String,
    // Financials
    paymentTerms: { type: Number, default: 30 }, // Days (e.g. 30, 0 for immediate)
    totalSpent: { type: Number, default: 0 }, // Cache (Virtual or updated on invoice)
    contactPerson: String, // For corporate clients
    contacts: [{ // Multiple contacts per client
        name: String,
        role: String,
        phone: String,
        email: String
    }],
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);
