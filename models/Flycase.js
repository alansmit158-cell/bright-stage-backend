const mongoose = require('mongoose');

const FlycaseSchema = new mongoose.Schema({
    qrCodeID: { type: String, required: true, unique: true }, // e.g., 'BS-BEAM300-001'
    equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    capacity: { type: Number, default: 2 },
    serialNumbers: [{ type: String }], // Serials of items INSIDE the case
    status: {
        type: String,
        enum: ['Available', 'In Use', 'Maintenance'],
        default: 'Available'
    },
}, { timestamps: true });

module.exports = mongoose.model('Flycase', FlycaseSchema);
