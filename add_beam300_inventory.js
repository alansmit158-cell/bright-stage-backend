const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function addBeam300() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const beam300 = {
            name: "Beam 300 Moving Head",
            quantity: 12, // 6 flycases * 2 units
            brand: "Clay Paky",
            model: "Beam 300",
            category: "Lumière standard",
            weight: 22,
            purchasePrice: 1500,
            rentalPricePerDay: 150,
            state: "Fonctionnel",
            ownership: "Bright Stage",
            type: "Rent",
            storageLocation: {
                zone: "Lumière",
                shelving: "Rack 1",
                shelf: "Bottom"
            },
            notes: "Conditionné par 2 en Flight Case (6 Flight Cases Total)"
        };

        // Check if exists
        const existing = await InventoryItem.findOne({ name: beam300.name });

        if (existing) {
            console.log("Beam 300 already exists in Inventory:", existing._id);
            // Optionally update quantity
            existing.quantity = 12;
            await existing.save();
            console.log("Updated quantity to 12.");
        } else {
            const newItem = new InventoryItem(beam300);
            await newItem.save();
            console.log("Created Beam 300 in Inventory:", newItem._id);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        mongoose.disconnect();
    }
}

addBeam300();
