const mongoose = require('mongoose');

const CompanySettingsSchema = new mongoose.Schema({
    // Company Info
    companyName: { type: String, default: 'Bright Stage' },
    legalName: { type: String },
    logo: { type: String }, // URL or base64
    taxId: { type: String }, // NIF/TVA

    // Contact & Address
    address: {
        street: String,
        city: String,
        postalCode: String,
        country: { type: String, default: 'Tunisia' }
    },

    phone: String,
    email: String,
    website: String,

    // Banking
    bankDetails: {
        bankName: String,
        iban: String,
        bic: String,
        accountNumber: String
    },

    // Invoice Settings
    invoicePrefix: { type: String, default: 'INV' },
    quotePrefix: { type: String, default: 'QUOT' },
    defaultCurrency: { type: String, default: 'DT' },

    // Legal Mentions (Footer text for invoices/quotes)
    legalMentions: { type: String },
    termsAndConditions: { type: String },

    // Tax Settings
    defaultVATRate: { type: Number, default: 0.19 }, // 19%

    // Singleton pattern - only one settings document
    _singleton: { type: Boolean, default: true, unique: true }

}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', CompanySettingsSchema);
