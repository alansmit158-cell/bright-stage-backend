const mongoose = require('mongoose');

const TaxExemptionCertificateSchema = new mongoose.Schema({
    certificateNumber: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    articleReference: {
        type: String,
        enum: ['Article 16', 'Article 40', 'Article 64'],
        required: true
    },
    documentUrl: String, // Link to PDF scan
    status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('TaxExemptionCertificate', TaxExemptionCertificateSchema);
