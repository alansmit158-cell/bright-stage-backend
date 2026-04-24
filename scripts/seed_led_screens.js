const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    {
        name: "Module LED Incurvé (50x50cm)",
        qty: 48,
        cat: "Écran LED",
        notes: "12m² Total - Réparti dans 6 Flycases (8 modules/case)"
    },
    {
        name: "Module LED Angle (50x50cm)",
        qty: 48,
        cat: "Écran LED",
        notes: "12m² Total - Réparti dans 6 Flycases (8 modules/case)"
    }
];

async function seedLEDScreens() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of items) {
            const existing = await InventoryItem.findOne({ name: item.name });
            if (existing) {
                console.log(`Updating ${item.name}...`);
                existing.quantity = item.qty;
                existing.category = item.cat;
                existing.notes = item.notes;
                await existing.save();
            } else {
                console.log(`Creating ${item.name}...`);
                const newItem = new InventoryItem({
                    name: item.name,
                    quantity: item.qty,
                    category: item.cat,
                    notes: item.notes,
                    state: 'Fonctionnel',
                    ownership: 'Bright Stage',
                    type: 'Rent',
                    storageLocation: { zone: 'Stock', shelving: 'Video', shelf: 'LED' }
                });
                await newItem.save();
            }
        }

        console.log('LED Screens Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedLEDScreens();
