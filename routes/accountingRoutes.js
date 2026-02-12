const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get Chart of Accounts
router.get('/', protect, async (req, res) => {
    try {
        const accounts = await Account.find().sort({ code: 1 });
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Account
router.post('/', protect, authorize('Founder', 'Admin'), async (req, res) => {
    try {
        const newAccount = new Account(req.body);
        await newAccount.save();
        res.status(201).json(newAccount);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Seed Standard Plan Comptable (Tunisian/French styled simplified)
router.post('/seed', protect, authorize('Founder', 'Admin'), async (req, res) => {
    try {
        const count = await Account.countDocuments();
        if (count > 0) return res.status(400).json({ error: 'Accounts already exist. Clear them first if you want to re-seed.' });

        const standardAccounts = [
            // Class 1: Capitaux
            { code: '101', name: 'Capital social', category: 'Capitaux', class: 1 },
            { code: '120', name: 'Résultat de l\'exercice', category: 'Capitaux', class: 1 },

            // Class 2: Immobilisations
            { code: '215', name: 'Matériel et outillage', category: 'Actif', class: 2 },
            { code: '218', name: 'Autres immobilisations corporelles', category: 'Actif', class: 2 },

            // Class 3: Stocks
            { code: '310', name: 'Matières premières', category: 'Actif', class: 3 },
            { code: '370', name: 'Stocks de marchandises', category: 'Actif', class: 3 },

            // Class 4: Tiers
            { code: '401', name: 'Fournisseurs', category: 'Passif', class: 4, systemTag: 'Supplier' },
            { code: '411', name: 'Clients', category: 'Actif', class: 4, systemTag: 'Client' },
            { code: '4456', name: 'TVA Déductible', category: 'Actif', class: 4, systemTag: 'VAT_Deductible' },
            { code: '4457', name: 'TVA Collectée', category: 'Passif', class: 4, systemTag: 'VAT_Collected' },

            // Class 5: Financiers
            { code: '512', name: 'Banque', category: 'Actif', class: 5, systemTag: 'Bank' },
            { code: '530', name: 'Caisse', category: 'Actif', class: 5, systemTag: 'Cash' },

            // Class 6: Charges
            { code: '601', name: 'Achats de matières', category: 'Charges', class: 6 },
            { code: '606', name: 'Achats non stockés', category: 'Charges', class: 6 },
            { code: '607', name: 'Achats de marchandises', category: 'Charges', class: 6 },
            { code: '613', name: 'Locations', category: 'Charges', class: 6 },
            { code: '615', name: 'Entretien et réparations', category: 'Charges', class: 6 },
            { code: '623', name: 'Publicité', category: 'Charges', class: 6 },
            { code: '625', name: 'Déplacements', category: 'Charges', class: 6 },
            { code: '626', name: 'Télécommunications', category: 'Charges', class: 6 },
            { code: '640', name: 'Charges de personnel', category: 'Charges', class: 6 },

            // Class 7: Produits
            { code: '701', name: 'Ventes de produits finis', category: 'Produits', class: 7, systemTag: 'Sales_Goods' },
            { code: '706', name: 'Prestations de services', category: 'Produits', class: 7, systemTag: 'Sales_Service' },
        ];

        await Account.insertMany(standardAccounts);
        res.json({ message: 'Seed successful', count: standardAccounts.length });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Reports ---

// 1. Compte de Résultat (P&L) - Produits vs Charges
router.get('/pnl', protect, async (req, res) => {
    try {
        const Invoice = require('../models/Invoice');
        // Calculate Revenue (Produits)
        // In a real system, you would sum transactions linked to Class 7 accounts
        // Here we roughly sum Invoices for "Revenue"

        const currentYear = new Date().getFullYear();
        const start = new Date(currentYear, 0, 1);
        const end = new Date(currentYear, 11, 31);

        const paidInvoices = await Invoice.find({
            status: { $in: ['Paid', 'Partially Paid'] },
            date: { $gte: start, $lte: end }
        });

        // Sum actual revenue (excluding VAT if tracking clean P&L, but simplified here)
        const totalRevenue = paidInvoices.reduce((acc, inv) => acc + (inv.financials.totalExclTax || 0), 0);

        // Expenses (Charges) - For now simplified, but in real app would sum Expenses/Bills
        // Assume simplified flat 40% cost for demo or 0 if no expense tracking yet
        const totalExpenses = 0; // TODO: Link to Expense model

        const pnl = {
            revenue: totalRevenue,
            expenses: totalExpenses,
            netResult: totalRevenue - totalExpenses,
            period: currentYear
        };

        res.json(pnl);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Bilan (Balance Sheet) - Assets vs Liabilities
router.get('/balance-sheet', protect, async (req, res) => {
    try {
        const Invoice = require('../models/Invoice');
        const BankTransaction = require('../models/BankTransaction');

        // Assets (Actif)
        // 1. Bank Balance (Trésorerie)
        const allTx = await BankTransaction.find({});
        const bankBalance = allTx.reduce((acc, tx) => acc + (tx.amount || 0), 0);

        // 2. Accounts Receivable (Créances Clients) - Unpaid Invoices
        const unpaidInvoices = await Invoice.find({ status: { $in: ['Sent', 'Partially Paid', 'Overdue'] } });
        const receivables = unpaidInvoices.reduce((acc, inv) => {
            return acc + (inv.financials.totalInclTax - (inv.totalPaid || 0));
        }, 0);

        // Liabilities (Passif) - e.g., VAT to pay, Loans
        // Simplified
        const liabilities = 0;

        const equity = (bankBalance + receivables) - liabilities;

        res.json({
            assets: {
                bank: bankBalance,
                receivables: receivables,
                total: bankBalance + receivables
            },
            liabilities: {
                total: liabilities
            },
            equity: equity
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Trésorerie (Cash Flow)
router.get('/cash-flow', protect, async (req, res) => {
    try {
        const BankTransaction = require('../models/BankTransaction');
        const Invoice = require('../models/Invoice');

        // Current Cash
        const allTx = await BankTransaction.find({}).sort({ date: 1 });
        const currentBalance = allTx.reduce((acc, tx) => acc + (tx.amount || 0), 0);

        // Forecast (Coming In)
        const unpaidInvoices = await Invoice.find({
            status: { $in: ['Sent', 'Partially Paid', 'Overdue'] },
            dueDate: { $gte: new Date() } // Future due
        });
        const incoming = unpaidInvoices.reduce((acc, inv) => {
            return acc + (inv.financials.totalInclTax - (inv.totalPaid || 0));
        }, 0);

        res.json({
            currentBalance,
            incomingForecast: incoming,
            projectedBalance: currentBalance + incoming
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 4. Analytics: Revenue Over Time (Chiffre d'Affaires par mois)
router.get('/revenue-over-time', protect, async (req, res) => {
    try {
        const Invoice = require('../models/Invoice');
        const year = new Date().getFullYear();

        // Aggregate: month -> revenue
        const result = await Invoice.aggregate([
            {
                $match: {
                    status: { $in: ['Paid', 'Partially Paid', 'Validated', 'Sent'] }, // Should we count Sent? Usually Validated counts as revenue in accrual accounting
                    date: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$date" }, // 1-12
                    revenue: { $sum: "$financials.totalExclTax" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill missing months
        const data = Array.from({ length: 12 }, (_, i) => {
            const found = result.find(r => r._id === (i + 1));
            return {
                month: new Date(0, i).toLocaleString('default', { month: 'short' }),
                revenue: found ? found.revenue : 0
            };
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Aged Balance (Balance Agée)
router.get('/aged-balance', protect, async (req, res) => {
    try {
        const Invoice = require('../models/Invoice');

        // Find all unpaid invoices
        const unpaid = await Invoice.find({
            status: { $in: ['Sent', 'Partially Paid', 'Overdue'] }
        }).populate('client', 'name');

        const now = new Date();
        const buckets = {
            notDue: 0,
            days30: 0, // 1-30 days overdue
            days60: 0, // 31-60
            days90: 0, // 61-90
            days90plus: 0 // >90
        };

        const clientBalances = {}; // { clientName: totalDue }

        unpaid.forEach(inv => {
            const due = inv.financials.totalInclTax - (inv.totalPaid || 0);

            // Track per client
            const clientName = inv.client?.name || inv.clientName || 'Unknown';
            clientBalances[clientName] = (clientBalances[clientName] || 0) + due;

            // Buckets
            const dueDate = new Date(inv.dueDate);
            const diffTime = now - dueDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                buckets.notDue += due;
            } else if (diffDays <= 30) {
                buckets.days30 += due;
            } else if (diffDays <= 60) {
                buckets.days60 += due;
            } else if (diffDays <= 90) {
                buckets.days90 += due;
            } else {
                buckets.days90plus += due;
            }
        });

        // Top Debtors
        const topDebtors = Object.entries(clientBalances)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        res.json({ buckets, topDebtors });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Export Data (CSV)
router.get('/export/:type', protect, async (req, res) => {
    try {
        const type = req.params.type;
        let csvContent = '';
        let filename = 'export.csv';

        if (type === 'invoices') {
            const Invoice = require('../models/Invoice');
            const invoices = await Invoice.find().populate('client', 'name');

            // Header
            csvContent = 'Number,Date,Client,Total HT,Total VAT,Total TTC,Status\n';

            // Rows
            invoices.forEach(inv => {
                const line = [
                    inv.number,
                    new Date(inv.date).toLocaleDateString(),
                    `"${inv.client?.name || inv.clientName || ''}"`,
                    inv.financials.totalExclTax.toFixed(3),
                    inv.financials.totalTax.toFixed(3),
                    inv.financials.totalInclTax.toFixed(3),
                    inv.status
                ].join(',');
                csvContent += line + '\n';
            });
            filename = 'invoices_export.csv';
        }


        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csvContent);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
