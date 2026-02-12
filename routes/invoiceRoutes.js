const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Project = require('../models/Project');
const PdfService = require('../services/PdfService'); // We will need to update this Service potentially
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @typedef {import('express').Request & { user: { _id: any, role: string, [key: string]: any } }} AuthRequest
 */

// Get All Invoices
router.get('/', protect, async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Invoice
router.get('/:id', protect, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Invoice
router.post('/', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        // Auto-generate Invoice Number if not provided
        // Format: INV-YYYY-SEQ (e.g. INV-2026-001)
        if (!req.body.number) {
            const year = new Date().getFullYear();
            const count = await Invoice.countDocuments({
                createdAt: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31) }
            });
            const seq = (count + 1).toString().padStart(3, '0');
            req.body.number = `INV-${year}-${seq}`;
        }

        const newInvoice = new Invoice({
            ...req.body,
            createdBy: (/** @type {AuthRequest} */ (req)).user._id
        });

        const savedInvoice = await newInvoice.save();
        res.status(201).json(savedInvoice);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Create Invoice From Project (Quote)
router.post('/from-project/:projectId', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId).populate('client').populate('items.inventoryItem');
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Check if invoice already exists? Maybe not strict, multiple invoices per project allowed.

        // Generate Number
        const year = new Date().getFullYear();
        const count = await Invoice.countDocuments({
            createdAt: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31) }
        });
        const seq = (count + 1).toString().padStart(3, '0');
        const number = `INV-${year}-${seq}`;

        const newInvoice = new Invoice({
            number,
            client: {
                id: project.client?._id,
                name: project.clientName || project.client?.name || 'Unknown',
                address: project.client?.address || '',
                taxId: project.client?.taxId || '',
                contactPerson: project.client?.contactPerson || ''
            },
            date: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            items: project.items.map(item => ({
                name: item.name,
                description: item.name,
                quantity: item.quantity,
                unitPrice: 0, // Need to implement price on project items or fetch default
                total: 0
            })),
            financials: {
                totalExclTax: project.financials?.totalExclTax || 0,
                totalTax: project.financials?.totalTax || 0,
                stampDuty: project.financials?.stampDuty || 1.000,
                totalInclTax: project.financials?.totalInclTax || 0
            },
            status: 'Draft',
            relatedProject: project._id,
            createdBy: (/** @type {AuthRequest} */ (req)).user._id
        });

        // If project items have no pricing, financials might be 0.
        // User will likely need to edit the draft.

        await newInvoice.save();
        res.status(201).json(newInvoice);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Invoice (Enforce Immutability)
router.put('/:id', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // IMMUTABILITY CHECK
        // If invoice is already Validated/Sent/Paid, disallow editing critical fields
        // Allow updating Payment Status logic or notes maybe, but not core financials
        if (['Validated', 'Sent', 'Paid', 'Partially Paid', 'Overdue'].includes(invoice.status)) {
            // Only allow specific updates like Status (if moving to Paid via other means), Notes, or payments
            // But here we are generally updating the whole object
            // For safety, assume NO edits to content.

            // Exception: If we are just changing status (e.g. Sent -> Paid manually, rarely done here, usually via payment route)
            // But if user tries to modify items/financials:
            if (req.body.items || req.body.financials || req.body.client) {
                return res.status(403).json({ error: 'Cannot modify a Validated invoice. Only Drafts can be edited.' });
            }
        }

        // If status changing from Draft -> Validated
        if (invoice.status === 'Draft' && req.body.status === 'Validated') {
            // Lock it down logic if needed (e.g. generate final hash)
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedInvoice);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Add Payment
router.post('/:id/payments', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const { amount, method, reference, note, date } = req.body;

        // Add payment
        invoice.payments.push({
            amount: Number(amount),
            method,
            reference,
            note,
            date: date || new Date()
        });

        // Recalculate Total Paid
        invoice.totalPaid = invoice.payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Update Status
        // Use a small epsilon for float comparison
        if (invoice.totalPaid >= (invoice.financials.totalInclTax - 0.005)) {
            invoice.status = 'Paid';
            // Also update the project paymentStatus if linked? 
            // Ideally yes, but let's keep it simple for now or fetch project.
        } else if (invoice.totalPaid > 0) {
            invoice.status = 'Partially Paid';
        }

        await invoice.save();

        // Optional: Update Linked Project Payment Status
        if (invoice.relatedProject && invoice.status === 'Paid') {
            // Check if this was a deposit or full invoice?
            // If deposit invoice is paid, project is "Deposit Paid" or "Unpaid" but confirmed?
            // The project model has `paymentStatus`.
            const project = await Project.findById(invoice.relatedProject);
            if (project) {
                // Logic to determine project status based on this invoice
                // For now, if Deposit Invoice is paid, maybe set to 'Deposit Paid'
                // This requires knowledge of what type of invoice it is.
            }
        }

        res.json(invoice);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Send Reminder
router.post('/:id/reminders', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        let clientEmail = null;
        if (invoice.client && invoice.client.id) {
            // Fetch Client object if email not stored on invoice snapshot (it isn't usually)
            // But verify if client snapshot has contact details?
            // Invoice.js schema has: client: { name, address, taxId, contactPerson }. No email.
            // Need to fetch valid client email or use project
            const Client = require('../models/Client');
            const client = await Client.findById(invoice.client.id);
            if (client) clientEmail = client.email;
        }

        // Fallback: Check Linked Project for client email
        if (!clientEmail && invoice.relatedProject) {
            const project = await Project.findById(invoice.relatedProject);
            if (project && project.client && project.client.email) {
                clientEmail = project.client.email;
            }
        }

        if (!clientEmail) {
            return res.status(400).json({ error: 'No client email found to send reminder.' });
        }

        const { sendInvoiceReminder } = require('../services/EmailService');
        const sent = await sendInvoiceReminder(invoice, clientEmail);

        if (sent) {
            invoice.reminders.push({
                type: 'Email',
                status: 'Sent',
                date: new Date()
            });
            await invoice.save();
            res.json({ message: 'Reminder sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send email' });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate PDF
router.get('/:id/pdf', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoice.number}.pdf`);

        // We need to add a method to PdfService for the Invoice Model specifically
        // or adapt the existing generic one. 
        // For now, let's assume we update PdfService to handle 'Invoice' model structure 
        // which matches the Project structure mostly.
        const PdfService = require('../services/PdfService');
        PdfService.generateInvoiceFromModel(invoice, res);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Electronic Invoicing (Article 53 LF 2026) ---

/**
 * @route   POST /api/invoices/:id/validate
 * @desc    Validate invoice for electronic compliance (Article 53)
 * @access  Private (Admin/Manager)
 */
router.post('/:id/validate', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        if (invoice.status !== 'Draft') {
            return res.status(400).json({ error: 'Only Draft invoices can be validated.' });
        }

        // 1. Verify Mandatory Fields (Article 53)
        const mandatoryFields = [
            'number', 'date', 'client.name', 'client.taxId', 'items', 'financials.totalExclTax', 'financials.totalInclTax'
        ];

        for (const field of mandatoryFields) {
            const keys = field.split('.');
            let val = invoice;
            for (const key of keys) {
                val = val ? val[key] : undefined;
            }
            if (!val || (Array.isArray(val) && val.length === 0)) {
                return res.status(400).json({ error: `Mandatory field missing or empty: ${field}` });
            }
        }

        // Check each item for required description and price
        const invalidItem = invoice.items.find(item => !item.name || item.quantity <= 0 || item.unitPrice <= 0);
        if (invalidItem) {
            return res.status(400).json({ error: "One or more items are invalid (missing name, quantity or price)." });
        }

        // 2. Immutability & Status Update
        invoice.status = 'Validated';
        invoice.validatedAt = new Date();

        // 3. Generate Structured JSON for Electronic Signature (Future use)
        // We can add a "electronicSignatureData" field to the model if needed, 
        // but here we just ensure the snapshot is clean.

        await invoice.save();
        res.json({ message: "Invoice validated and locked.", invoice });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
