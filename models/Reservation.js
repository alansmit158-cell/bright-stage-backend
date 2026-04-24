const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true },
    itemName: String, // Cached for easier display/debugging
    dates: {
        start: { type: Date, required: true },
        end: { type: Date, required: true }
    },
    status: {
        type: String,
        enum: ['Active', 'Cancelled', 'Completed'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', ReservationSchema);
