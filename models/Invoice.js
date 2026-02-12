const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true }, // e.g., INV-2026-001

    // Client Snapshot (Invoices shouldn't change if client details change later)
    client: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        name: String,
        address: String,
        taxId: String,
        contactPerson: String
    },

    // Dates
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },

    // Line Items
    items: [{
        name: String,
        description: String,
        quantity: Number,
        unitPrice: Number, // HT
        taxRate: { type: Number, default: 0.19 }, // Individual tax rate (7% or 19%)
        total: Number // HT
    }],

    // Financials
    financials: {
        totalExclTax: { type: Number, required: true }, // HT
        totalTax: { type: Number, required: true }, // VAT
        stampDuty: { type: Number, default: 1.000 }, // Timbre
        totalInclTax: { type: Number, required: true } // TTC
    },

    status: {
        type: String,
        enum: ['Draft', 'Validated', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'],
        default: 'Draft'
    },

    // Linkage (Optional)
    relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    notes: String,

    // Payments
    payments: [{
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        method: { type: String, enum: ['Cash', 'Check', 'Bank Transfer', 'Other'], default: 'Bank Transfer' },
        reference: String,
        note: String
    }],
    totalPaid: { type: Number, default: 0 },

    // Reminders
    reminders: [{
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['Email', 'SMS', 'Manual'], default: 'Email' },
        status: { type: String, default: 'Sent' }
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // 2026 Tax Law Fields
    isTvaSuspended: { type: Boolean, default: false },
    taxExemptionCertificate: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxExemptionCertificate' }
}, { timestamps: true });

// Method to calculate totals according to Article 47
InvoiceSchema.methods.calculateTotals = function () {
    let totalExclTax = 0;
    let totalTax = 0;

    this.items.forEach(item => {
        const itemHT = (item.unitPrice * item.quantity);
        totalExclTax += itemHT;

        // If TVA is suspended, tax is 0. Otherwise check item tax (defaulting to 19% if not specified)
        if (!this.isTvaSuspended) {
            const rate = item.taxRate || 0.19;
            totalTax += (itemHT * rate);
        }
    });

    this.financials.totalExclTax = totalExclTax;
    this.financials.totalTax = totalTax;

    // Note: Article 47 might imply specific exemptions on stamp duty or other local specifics
    // for now we follow the general rule: HT + TVA + Timbre
    this.financials.totalInclTax = totalExclTax + totalTax + (this.financials.stampDuty || 0);

    return this.financials;
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
