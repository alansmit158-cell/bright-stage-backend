const mongoose = require('mongoose');

const DeliveryNoteSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Optional now
    date: { type: Date, default: Date.now },
    number: { type: String, unique: true }, // BL-YYYY-XXXX
    isIndividual: { type: Boolean, default: false }, // Flag for project-less BLs

    // Transport Info (Snapshot or Link)
    carrier: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier' },
    vehiclePlate: String,
    vehicleModel: String,
    driverName: String,
    driverPhone: String,
    driverCin: String,

    status: {
        type: String,
        enum: ['Draft', 'Validated', 'Cancelled'],
        default: 'Draft'
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: String,

    // For V1, we can link to inventory items if needed, but keeping it flexible for now
    items: [{
        inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        name: String,
        quantity: { type: Number, default: 1 },
        reference: String
    }]
}, { timestamps: true });

// Auto-generate BL Number before saving
DeliveryNoteSchema.pre('save', async function () {
    if (!this.number) {
        const date = new Date();
        const year = date.getFullYear();
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        // Format: BL-2024-001
        this.number = `BL-${year}-${String(count + 1).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('DeliveryNote', DeliveryNoteSchema);
