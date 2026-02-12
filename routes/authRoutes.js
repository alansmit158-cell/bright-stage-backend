const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'brightstage_secret_key_123';

// Date utility for Points History
const addPoints = async (userId, amount, reason) => {
    try {
        await User.findByIdAndUpdate(userId, {
            $inc: { points: amount },
            $push: { pointsHistory: { reason, points: amount } }
        });
    } catch (err) { console.error("Error adding points:", err); }
};

// REGISTER (Admin or Setup)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'Worker'
        });

        const savedUser = await newUser.save();
        res.status(201).json({ message: "User created", userId: savedUser._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: "User not found" });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: "Invalid password" });

        if (!user.isActive) return res.status(403).json({ error: "Account disabled" });

        // Create Token
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Return user info (excluding password)
        const { password: _, ...userInfo } = user._doc;
        res.json({ token, user: userInfo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { protect } = require('../middleware/authMiddleware');

/**
 * @typedef {import('express').Request & { user: { _id: any, role: string, [key: string]: any } }} AuthRequest
 */

// GET ME (Validate Token)
router.get('/me', protect, async (req, res) => {
    res.json((/** @type {AuthRequest} */ (req)).user);
});

// Profile alias for mobile app
router.get('/profile', protect, async (req, res) => {
    res.json((/** @type {AuthRequest} */ (req)).user);
});

module.exports = router;
