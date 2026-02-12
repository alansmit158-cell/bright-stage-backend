const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    { name: "Structure PT34 300cm", qty: 24, cat: "Structure métallique", notes: "Longueur 3m" },
    { name: "Structure PT34 250cm", qty: 2, cat: "Structure métallique", notes: "Longueur 2.5m" },
    { name: "Structure PT34 200cm", qty: 20, cat: "Structure métallique", notes: "Longueur 2m" }
];

async function seedStructure() {
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
                    storageLocation: { zone: 'Stock', shelving: 'Structure', shelf: '1' }
                });
                await newItem.save();
            }
        }

        console.log('Structure PT34 Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedStructure();
