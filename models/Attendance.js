const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Optional link to project
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    type: {
        type: String,
        enum: ['Regular', 'Overtime', 'Night', 'Travel'],
        default: 'Regular'
    },
    notes: String,
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    // Calculated Hours
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    nightHours: { type: Number, default: 0 }, // 21h-06h
    totalHours: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
