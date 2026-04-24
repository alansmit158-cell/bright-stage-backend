const Equipment = require('../models/Equipment');
const Flycase = require('../models/Flycase');

// Create Equipment & Auto-Generate 6 Flycases
exports.createEquipmentWithFlycases = async (req, res) => {
    try {
        const { name, category, brand, model, specs } = req.body;

        // 1. Create the main Equipment record
        const equipment = new Equipment({
            name,
            category,
            brand,
            model,
            specs
        });
        await equipment.save();

        // 2. Auto-Generate 6 Flycases (2 units per case = 12 total units)
        const flycases = [];
        const baseQR = `BS-${model.toUpperCase().replace(/\s+/g, '')}`; // e.g., BS-BEAM300

        for (let i = 1; i <= 6; i++) {
            const caseNum = String(i).padStart(3, '0'); // 001, 002...

            // Generate unique Serial Numbers for the 2 units inside
            const serialA = `SN-${model.toUpperCase()}-${caseNum}-A`;
            const serialB = `SN-${model.toUpperCase()}-${caseNum}-B`;

            const flycase = new Flycase({
                qrCodeID: `${baseQR}-${caseNum}`, // BS-BEAM300-001
                equipment: equipment._id,
                capacity: 2,
                serialNumbers: [serialA, serialB],
                status: 'Available'
            });

            await flycase.save();
            flycases.push(flycase);
        }

        res.status(201).json({
            message: 'Equipment and 6 Flycases created successfully',
            equipment,
            flycases
        });

    } catch (error) {
        console.error("Error creating flycases:", error);
        res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
    }
};

// Get Flycase by QR Code (Scan)
exports.getFlycaseByQR = async (req, res) => {
    try {
        const { qrCodeID } = req.params;
        const flycase = await Flycase.findOne({ qrCodeID }).populate('equipment');

        if (!flycase) {
            return res.status(404).json({ message: 'Flycase not found' });
        }
        res.json(flycase);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Toggle Status (Check-In / Check-Out)
exports.toggleFlycaseStatus = async (req, res) => {
    try {
        const { qrCodeID } = req.params;
        const { status } = req.body; // 'Available' or 'In Use'

        const flycase = await Flycase.findOneAndUpdate(
            { qrCodeID },
            { status },
            { new: true }
        );

        if (!flycase) {
            return res.status(404).json({ message: 'Flycase not found' });
        }
        res.json(flycase);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
