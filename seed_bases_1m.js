const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    {
        name: "Embase Lourde 100cm (Hybride)",
        qty: 12,
        cat: "Accessoires structure",
        notes: "Modulable PT34 / HT44"
    },
    {
        name: "Embase Lourde 100cm (PT34)",
        qty: 4,
        cat: "Accessoires structure",
        notes: "Standard PT34"
    }
];

async function seedBases() {
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
                    storageLocation: { zone: 'Stock', shelving: 'Structure', shelf: 'Bases' }
                });
                await newItem.save();
            }
        }

        console.log('Bases 1M Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedBases();
