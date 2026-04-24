const mongoose = require('mongoose');

const LedProjectSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    configType: {
        type: String,
        enum: ['Flat', 'L-Shape', 'Curved', 'Complex'],
        default: 'Flat'
    },
    // Cabinet Specifications (Defaults to standard P2.6)
    cabinetSpec: {
        width: { type: Number, default: 500 }, // mm
        height: { type: Number, default: 500 }, // mm
        pixelPitch: { type: Number, default: 2.6 }, // mm
        weight: { type: Number, default: 8.5 }, // kg
        maxPower: { type: Number, default: 120 } // Watts
    },
    // Configuration Details
    faceA: {
        cols: { type: Number, default: 4 },
        rows: { type: Number, default: 3 },
        side: { type: String, default: 'Main' }
    },
    faceB: {
        cols: { type: Number, default: 0 },
        rows: { type: Number, default: 0 },
        side: { type: String, default: 'Return' } // For L-Shape
    },
    // For Complex Screen Formats
    screenElements: [{
        id: { type: String, required: true },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        cols: { type: Number, default: 1 },
        rows: { type: Number, default: 1 },
        name: { type: String }
    }],
    // Mounting
    mounting: {
        type: String,
        enum: ['Ground-Stack', 'Flown'],
        default: 'Flown'
    },
    // Calculated Totals (Cached for quick access)
    stats: {
        totalWidth: Number, // mm
        totalHeight: Number, // mm
        totalResolutionW: Number,
        totalResolutionH: Number,
        totalWeight: Number, // kg
        totalPower: Number // W
    },
    // Meta
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Middleware to auto-calculate stats before save?
// Or we calculate in controller using service. Controller is better for now.

module.exports = mongoose.model('LedProject', LedProjectSchema);
