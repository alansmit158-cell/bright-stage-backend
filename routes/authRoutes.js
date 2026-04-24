const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = 'brightstage_secret_key_123';

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
    console.log(`[AUTH] Login attempt for: ${req.body.email}`);

    const connectDB = require('../config/db');

    try {
        await connectDB();
        const { email, password } = req.body;

        // Timeout protection
        const userPromise = User.findOne({ email });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 9000));

        const user = await Promise.race([userPromise, timeoutPromise]);

        if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
            return res.status(404).json({ error: "User not found" });
        }

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            console.log(`[AUTH] Invalid password for: ${email}`);
            return res.status(400).json({ error: "Invalid password" });
        }

        if (!user.isActive) return res.status(403).json({ error: "Account disabled" });

        // Create Token
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            SECRET_KEY,
            { expiresIn: '365d' }
        );

        console.log(`[AUTH] Login success: ${email} (${user.role})`);

        // Return user info (excluding password)
        const { password: _, ...userInfo } = user._doc;
        res.json({ token, user: userInfo });
    } catch (err) {
        console.error(`[AUTH] Login error for ${req.body.email}:`, err);
        if (err.message === 'DB_TIMEOUT') {
            return res.status(504).json({ error: "Database timeout. Please try again." });
        }
        res.status(500).json({
            error: "Internal Server Error during login",
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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
