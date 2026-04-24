const mongoose = require('mongoose');

const TransferSchema = new mongoose.Schema({
    sourceProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    destinationProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    items: [{
        inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        name: String,
        quantity: Number
    }],
    date: { type: Date, default: Date.now },
    driverName: String,
    vehiclePlate: String,

    // Signatures (Base64 strings or URLs)
    senderSignature: String,   // Signature of person at Site A
    receiverSignature: String, // Signature of person at Site B

    status: { type: String, enum: ['Pending', 'Completed'], default: 'Completed' }
}, { timestamps: true });

module.exports = mongoose.model('Transfer', TransferSchema);
