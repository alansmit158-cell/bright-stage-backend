const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// GET /api/messages - Fetch chat history
router.get('/', protect, async (req, res) => {
    try {
        const { room = 'general', limit = 50 } = req.query;
        const messages = await Message.find({ room })
            .sort({ createdAt: 1 }) // Oldest first for chat timeline
            .limit(parseInt(limit));
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/messages - Send a message (HTTP fallback)
router.post('/', protect, async (req, res) => {
    try {
        const { content, room = 'general' } = req.body;

        const newMessage = new Message({
            sender: req.user._id,
            senderName: req.user.name,
            content,
            room,
            createdAt: new Date()
        });

        await newMessage.save();

        // If socket.io is available (local), emit to room
        // req.app.get('io') could be used if we passed io instance to app
        // For Vercel, this just saves to DB, and clients poll.

        res.status(201).json(newMessage);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
