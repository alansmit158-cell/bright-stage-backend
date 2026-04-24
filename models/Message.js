const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    room: { type: String, default: 'general' }, // Could be project ID or 'general'
    createdAt: { type: Date, default: Date.now }
});

// TTL Index: expire after 3 months (90 days * 24h * 60m * 60s = 7776000 seconds)
// Note: MongoDB background thread runs every 60s to remove expired documents.
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Message', MessageSchema);
