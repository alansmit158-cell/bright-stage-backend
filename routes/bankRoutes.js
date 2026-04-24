const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const BankTransaction = require('../models/BankTransaction');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Upload Bank CSV/Excel
router.post('/upload', protect, authorize('Founder', 'Manager', 'Admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const transactions = [];
        let importedCount = 0;

        for (const row of rows) {
            // Mapping Logic (User might need to map columns in real app, assume standard format for now)
            // Expected keys: Date, Amount, Description, Reference
            // Adjust fuzzy keys
            const date = row['Date'] || row['Date de valeur'] || row['date'];
            const amount = row['Amount'] || row['Montant'] || row['Credit'] || (row['Debit'] ? -row['Debit'] : 0);
            const desc = row['Description'] || row['Libellé'] || row['Label'];
            const ref = row['Reference'] || row['Ref'];

            if (date && amount) {
                // Parse date (Excel date code or string)
                let parsedDate = date;
                // If excel serial number?
                // For now assume standard JS parseable

                const tx = new BankTransaction({
                    date: new Date(parsedDate),
                    amount: parseFloat(amount),
                    description: desc || 'Unknown',
                    reference: ref || '',
                    rawLine: JSON.stringify(row)
                });
                await tx.save();
                transactions.push(tx);
                importedCount++;
            }
        }

        res.json({ message: `Imported ${importedCount} transactions`, transactions });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Pending Transactions with Suggestions
router.get('/pending', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const transactions = await BankTransaction.find({ status: 'Pending' }).sort({ date: -1 });

        // Simple suggestion logic
        // Find unpaid invoices with matching amount (+/- epsilon)
        const unpaidInvoices = await Invoice.find({ status: { $in: ['Sent', 'Partially Paid', 'Overdue'] } });

        const results = transactions.map(tx => {
            const matches = unpaidInvoices.filter(inv => {
                const due = inv.financials.totalInclTax - (inv.totalPaid || 0);
                return Math.abs(due - tx.amount) < 0.1; // Exact match on remaining amount
            });
            return {
                ...tx.toObject(),
                suggestions: matches
            };
        });

        res.json(results);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reconcile
router.post('/:id/reconcile', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const tx = await BankTransaction.findById(req.params.id);
        if (!tx) return res.status(404).json({ error: 'Transaction not found' });

        const { invoiceId } = req.body;
        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // 1. Record Payment on Invoice
        invoice.payments.push({
            date: tx.date,
            amount: tx.amount,
            method: 'Bank Transfer',
            reference: 'Reconciliation: ' + (tx.reference || 'Bank Import'),
            note: tx.description
        });

        invoice.totalPaid = invoice.payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        if (invoice.totalPaid >= (invoice.financials.totalInclTax - 0.005)) {
            invoice.status = 'Paid';
        } else {
            invoice.status = 'Partially Paid';
        }
        await invoice.save();

        // 2. Update Transaction
        tx.status = 'Reconciled';
        tx.matchedModel = 'Invoice';
        tx.matchedId = invoice._id;
        await tx.save();

        res.json({ message: 'Reconciled successfully', invoice, transaction: tx });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
