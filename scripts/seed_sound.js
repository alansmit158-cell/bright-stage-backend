const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    { name: "DAS Audio Action 508A", qty: 6, cat: "Sonorisation", notes: "6 pièces dans 3 Flycases (2 par Flycase)" },
    { name: "DAS Audio Altea-Duo 20A", qty: 4, cat: "Sonorisation", notes: "4 pièces Sans Flycase" },
    { name: "DAS Audio Altea-515A", qty: 2, cat: "Sonorisation", notes: "2 pièces Sans Flycase" }, // Assumed no flycase as not specified
    { name: "FBT Maxx Serie 15A", qty: 4, cat: "Sonorisation", notes: "4 pièces Sans Flycase" }, // Assumed no flycase
    { name: "Yamaha DZR 315A", qty: 2, cat: "Sonorisation", notes: "2 pièces Sans Flycase" }, // "2 PIUECE" typo corrected, assumed no fly
    { name: "Yamaha XLF 18A", qty: 9, cat: "Sonorisation", notes: "9 pièces Sans Flycase" }, // "9 PIUECE"
    { name: "Yamaha DBR 15A", qty: 2, cat: "Sonorisation", notes: "2 pièces Sans Flycase" }
];

async function seedSound() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of items) {
            const existing = await InventoryItem.findOne({ name: item.name });
            if (existing) {
                console.log(`Updating ${item.name}...`);
                existing.quantity = item.qty;
                existing.notes = item.notes;
                existing.category = item.cat;
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
                    storageLocation: { zone: 'Son', shelving: 'General', shelf: '1' }
                });
                await newItem.save();
            }
        }

        console.log('Sound Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedSound();
