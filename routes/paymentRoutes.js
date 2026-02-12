const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @typedef {import('express').Request & { user: { _id: any, role: string, [key: string]: any } }} AuthRequest
 */

// Get All Payments
router.get('/', protect, async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('client', 'name')
            .populate('allocations.invoice', 'number')
            .sort({ date: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Payment & Allocate (Lettrage)
router.post('/', protect, authorize('Founder', 'Manager', 'Admin'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { client, amount, method, reference, date, allocations, notes } = req.body;
        // allocations: [{ invoiceId: "...", amount: 100 }, ...]

        let allocatedTotal = 0;
        const formattedAllocations = [];

        // 1. Process Allocations
        if (allocations && allocations.length > 0) {
            for (const alloc of allocations) {
                if (alloc.amount <= 0) continue;

                allocatedTotal += alloc.amount;

                const invoice = await Invoice.findById(alloc.invoiceId).session(session);
                if (!invoice) throw new Error(`Invoice ${alloc.invoiceId} not found`);

                // Update Invoice
                invoice.payments.push({
                    date: date || new Date(),
                    amount: alloc.amount,
                    method: method,
                    reference: reference,
                    note: `Payment Allocation`
                });

                invoice.totalPaid = (invoice.totalPaid || 0) + alloc.amount;

                // Update Status
                // floating point safety
                if (invoice.totalPaid >= (invoice.financials.totalInclTax - 0.005)) {
                    invoice.status = 'Paid';
                } else {
                    invoice.status = 'Partially Paid';
                }

                await invoice.save({ session });

                formattedAllocations.push({
                    invoice: invoice._id,
                    amount: alloc.amount
                });
            }
        }

        if (allocatedTotal > amount) {
            throw new Error(`Allocated total (${allocatedTotal}) exceeds payment amount (${amount})`);
        }

        // 2. Create Payment Record
        const newPayment = new Payment({
            client,
            amount,
            method,
            reference,
            date: date || new Date(),
            allocations: formattedAllocations,
            unallocatedAmount: amount - allocatedTotal,
            notes,
            createdBy: (/** @type {AuthRequest} */ (req)).user._id
        });

        await newPayment.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.status(201).json(newPayment);

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: err.message });
    }
});


module.exports = router;
