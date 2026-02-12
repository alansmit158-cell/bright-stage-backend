const express = require('express');
const router = express.Router();
const CompanySettings = require('../models/CompanySettings');
const Currency = require('../models/Currency');
const Account = require('../models/Account');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Company Settings ---

// Get Company Settings (Public for displaying on documents)
router.get('/company', async (req, res) => {
    try {
        let settings = await CompanySettings.findOne();

        // Create default if not exists
        if (!settings) {
            settings = new CompanySettings({
                companyName: 'Bright Stage',
                address: {
                    street: '123 Avenue Habib Bourguiba',
                    city: 'Tunis',
                    postalCode: '1000',
                    country: 'Tunisia'
                },
                phone: '+216 XX XXX XXX',
                email: 'contact@brightstage.tn'
            });
            await settings.save();
        }

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Company Settings
router.put('/company', protect, authorize('Founder', 'Admin'), async (req, res) => {
    try {
        let settings = await CompanySettings.findOne();

        if (!settings) {
            settings = new CompanySettings(req.body);
        } else {
            Object.assign(settings, req.body);
        }

        await settings.save();
        res.json(settings);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Currency Management ---

// Get All Currencies
router.get('/currencies', protect, async (req, res) => {
    try {
        const currencies = await Currency.find().sort({ code: 1 });
        res.json(currencies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Currency
router.post('/currencies', protect, authorize('Founder', 'Admin'), async (req, res) => {
    try {
        const newCurrency = new Currency(req.body);
        await newCurrency.save();
        res.status(201).json(newCurrency);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Currency (mainly for exchange rates)
router.put('/currencies/:id', protect, authorize('Founder', 'Admin'), async (req, res) => {
    try {
        const updated = await Currency.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Seed Default Currencies
router.post('/currencies/seed', protect, authorize('Founder', 'Admin'), async (req, res) => {
    try {
        const count = await Currency.countDocuments();
        if (count > 0) return res.status(400).json({ error: 'Currencies already exist' });

        const defaultCurrencies = [
            { code: 'DT', name: 'Tunisian Dinar', symbol: 'DT', exchangeRate: 1, isBaseCurrency: true },
            { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.30 },
            { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.32 }
        ];

        await Currency.insertMany(defaultCurrencies);
        res.json({ message: 'Currencies seeded successfully', count: defaultCurrencies.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Chart of Accounts (Already exists in accountingRoutes, but add convenience here) ---

// Get Chart of Accounts Summary
router.get('/chart-of-accounts', protect, async (req, res) => {
    try {
        const accounts = await Account.find().sort({ code: 1 });

        // Group by class
        const grouped = {};
        accounts.forEach(acc => {
            const className = `Class ${acc.class}`;
            if (!grouped[className]) grouped[className] = [];
            grouped[className].push(acc);
        });

        res.json(grouped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
