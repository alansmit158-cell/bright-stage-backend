const mongoose = require('mongoose');

const CurrencySchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // USD, EUR, DT
    name: { type: String, required: true }, // US Dollar, Euro, Tunisian Dinar
    symbol: { type: String, required: true }, // $, €, DT
    exchangeRate: { type: Number, default: 1 }, // Relative to base currency (DT)
    isBaseCurrency: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Currency', CurrencySchema);
