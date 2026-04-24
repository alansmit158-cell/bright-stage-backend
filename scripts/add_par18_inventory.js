const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function addPar18() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const itemData = {
            name: "PAR 18x18 Omni Light",
            quantity: 48, // 8 flycases * 6 units
            brand: "Omni Light",
            model: "PAR 18x18",
            category: "Lumière standard",
            weight: 5, // Estimated
            purchasePrice: 200, // Estimated
            rentalPricePerDay: 20, // Estimated
            state: "Fonctionnel",
            ownership: "Bright Stage",
            type: "Rent",
            storageLocation: {
                zone: "Lumière",
                shelving: "Rack 2",
                shelf: "Middle"
            },
            notes: "Conditionné par 6 en Flight Case (8 Flight Cases Total)"
        };

        // Check if exists
        const existing = await InventoryItem.findOne({ name: itemData.name });

        if (existing) {
            console.log("Item already exists in Inventory:", existing._id);
            existing.quantity = 48;
            existing.notes = itemData.notes;
            await existing.save();
            console.log("Updated quantity and notes.");
        } else {
            const newItem = new InventoryItem(itemData);
            await newItem.save();
            console.log("Created Item in Inventory:", newItem._id);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        mongoose.disconnect();
    }
}

addPar18();
