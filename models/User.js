const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String }, // For admin visibility only
    role: {
        type: String,
        enum: ['Founder', 'Manager', 'Storekeeper', 'Site Manager', 'Worker'],
        default: 'Worker'
    },
    points: { type: Number, default: 0 },
    pointsHistory: [{
        reason: String,
        points: Number,
        date: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true },
    phone: { type: String },
    cin: { type: String },
    address: { type: String },
    certifications: [{
        name: { type: String, required: true }, // e.g. CACES, Habilitation Électrique
        issueDate: Date,
        expiryDate: Date,
        documentUrl: String
    }],
    // --- Expert Profile Fields ---
    drivingLicenses: [{
        type: String,
        enum: ['A', 'B', 'BE', 'C', 'CE', 'D', 'DE']
    }],
    technicalSkills: [{ type: String }], // Tags: "Montage", "Son", "Lumière"
    emergencyContact: {
        name: String,
        phone: String,
        relation: String
    },
    baseRate: { type: Number, default: 0 }, // Internal Hourly Cost
    documents: [{
        title: String,
        type: String, // 'ID', 'Passport', 'Contract'
        url: String,
        expiryDate: Date
    }],
    birthDate: Date,
    hireDate: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
