const mongoose = require('mongoose');

const MaintenanceTicketSchema = new mongoose.Schema({
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    reportedBy: { type: String, required: true }, // User/Technician Name
    issueDescription: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'Critical'], default: 'Medium' },
    status: {
        type: String,
        enum: ['Open', 'In Review', 'Sent to Repair', 'Fixed', 'Unfixable'],
        default: 'Open'
    },
    repairCost: { type: Number, default: 0 },
    repairNotes: { type: String },
    dateReported: { type: Date, default: Date.now },
    dateResolved: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceTicket', MaintenanceTicketSchema);
