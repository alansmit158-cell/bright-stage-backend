const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    // Creator Info
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: String, // Cached name for display

    // Assignees (Users who can work on this)
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Permissions (controlled by Storekeeper/Admin)
    permissions: {
        locked: { type: Boolean, default: false },
        unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        canModifyEquipment: { type: Boolean, default: false },
        canModifyStaff: { type: Boolean, default: false }
    },

    // Client Info (for Quote/Billing)
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, // Link to Client Model
    client: {
        name: String,
        address: String,
        contactPerson: String,
        phone: String,
        email: String,
        taxId: String
    },

    // Event/Site Details
    eventName: { type: String, required: true },
    siteName: String,
    siteAddress: String,
    // Geofencing
    location: {
        latitude: Number,
        longitude: Number,
        radius: { type: Number, default: 200 } // Meters
    },

    // Dates
    dates: {
        start: Date, // Pick-up
        end: Date,   // Return
        totalDays: Number
    },

    // Workflow Status
    status: {
        type: String,
        enum: ['Draft', 'Confirmed', 'Pickup', 'Return', 'Done'], // Simplified workflow
        default: 'Draft'
    },
    // Validation & Locking
    validationStatus: {
        type: String,
        enum: ['Draft', 'Pending', 'Validated', 'Rejected'],
        default: 'Draft'
    },
    logisticsStatus: {
        type: String,
        enum: ['Prep', 'ReadyForExit', 'OnSite', 'Returning', 'Returned'],
        default: 'Prep'
    },
    exitQrCode: String,
    returnQrCode: String,
    exitScannedAt: Date,
    exitScannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    returnScannedAt: Date,
    returnScannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    returnReport: {
        missingItems: [{
            inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
            name: String,
            quantity: Number
        }],
        brokenItems: [{
            inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
            name: String,
            quantity: Number,
            penaltyApplied: { type: Boolean, default: false }
        }],
        cleanReturn: { type: Boolean, default: false }
    },

    preparationStatus: {
        type: String,
        enum: ['Pending', 'Ready'],
        default: 'Pending'
    },
    // Admin Validation (V0 - Apart from status flow)
    isValidated: { type: Boolean, default: false },

    // Equipment / Services List
    items: [{
        inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        subcontractedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcontractedItem' },
        source: { type: String, enum: ['internal', 'subcontracted'], default: 'internal' },
        name: String,
        brand: String,
        model: String,
        type: { type: String, enum: ['Rent', 'Sale', 'Service'], default: 'Rent' },
        quantity: Number,
        days: { type: Number, default: 1 }, // Specific days for this line item
        price: { type: Number, default: 0 }, // Unit Price (Sell)
        costPrice: { type: Number, default: 0 }, // Unit Cost (Buy/Internal) for margin
        discount: { type: Number, default: 0 } // Percentage
    }],

    // Financial Summary (Cached)
    financials: {
        totalExclTax: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
        stampDuty: { type: Number, default: 1.000 }, // Timbre Fiscal (1 DT)
        totalInclTax: { type: Number, default: 0 }, // TTC
        totalCost: { type: Number, default: 0 }, // Total internal cost
        margin: { type: Number, default: 0 } // Profit
    },

    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Deposit Paid', 'Partially Paid', 'Fully Paid', 'Overdue'],
        default: 'Unpaid'
    },

    // Team & Logistics (for Manifests / Transport)
    team: {
        siteLeader: {
            name: String,
            phone: String,
            email: String
        },
        members: [String], // Names
        manager: {
            name: String,
            phone: String,
            email: String
        }
    },

    transport: {
        driverName: String,
        driverLicense: String,
        vehicleModel: String,
        vehiclePlate: String,
        transportDate: Date
    },

    // Signatures / Stamps (Paths or Boolean flags)
    signatures: {
        quoteClient: Boolean,
        managerApproval: Boolean,
        pickup: Boolean,
        returnCheck: Boolean
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
