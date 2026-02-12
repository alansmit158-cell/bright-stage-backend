const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    { name: "Praticable de Scène 1.22x1.22m", qty: 28, cat: "Scène", notes: "Module 1.22*1.22" },
    { name: "Escalier de Scène", qty: 2, cat: "Scène", notes: "Escalier complet" },
    { name: "Côté de Scène", qty: 67, cat: "Scène", notes: "Garde-corps / Côté" },
    { name: "Pied de Scène", qty: 40, cat: "Scène", notes: "Pied ajustable" }
];

async function seedScene() {
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
                    storageLocation: { zone: 'Scène', shelving: 'General', shelf: '1' }
                });
                await newItem.save();
            }
        }

        console.log('Stage Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedScene();
