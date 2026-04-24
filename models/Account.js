const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // e.g., '411', '512'
    name: { type: String, required: true }, // e.g., 'Clients', 'Banque'
    category: {
        type: String,
        enum: ['Actif', 'Passif', 'Capitaux', 'Produits', 'Charges'],
        required: true
    },
    // Useful for quick filtering
    class: { type: Number, required: true }, // 1 to 7

    description: String,
    isActive: { type: Boolean, default: true },

    // Optional: link to system entities for automation
    systemTag: { type: String, enum: ['Client', 'Supplier', 'Bank', 'Cash', 'VAT_Collected', 'VAT_Deductible', 'Sales_Service', 'Sales_Goods', 'None'], default: 'None' }
}, { timestamps: true });

module.exports = mongoose.model('Account', AccountSchema);
