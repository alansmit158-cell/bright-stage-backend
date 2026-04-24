const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get All Users
router.get('/', protect, async (req, res) => {
    try {
        const users = await User.find({}).select('-password -plainPassword');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User - Founder, Manager, Site Manager, Storekeeper
router.put('/:id', protect, authorize('Founder', 'Manager', 'Site Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { name, email, role, isActive, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (role) {
            // Only Founder/Manager can elevate someone else TO Founder/Manager
            if (['Founder', 'Manager'].includes(role) && !['Founder', 'Manager'].includes(req.user.role)) {
                return res.status(403).json({ error: "Unauthorized to assign this role" });
            }
            user.role = role;
        }
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.cin) user.cin = req.body.cin;
        if (isActive !== undefined) user.isActive = isActive;
        if (password) {
            user.password = password;
            user.plainPassword = password;
        }

        // Expert Profile Updates
        if (req.body.drivingLicenses) user.drivingLicenses = req.body.drivingLicenses;
        if (req.body.technicalSkills) user.technicalSkills = req.body.technicalSkills;
        if (req.body.emergencyContact) user.emergencyContact = req.body.emergencyContact;
        if (req.body.baseRate !== undefined) user.baseRate = req.body.baseRate;
        if (req.body.documents) user.documents = req.body.documents;
        if (req.body.birthDate) user.birthDate = req.body.birthDate;
        if (req.body.hireDate) user.hireDate = req.body.hireDate;

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Points to User - Founder, Manager, Site Manager, Storekeeper
router.post('/:id/points', protect, authorize('Founder', 'Manager', 'Site Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { points, reason } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.points = (user.points || 0) + parseInt(points);
        user.pointsHistory.push({
            reason: reason || 'Achievement',
            points: parseInt(points),
            date: new Date()
        });

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
