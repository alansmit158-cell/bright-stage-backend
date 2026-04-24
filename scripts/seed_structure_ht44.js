const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    { name: "Structure HT44 400cm", qty: 9, cat: "Structure métallique", notes: "Longueur 4m" },
    { name: "Structure HT44 300cm", qty: 12, cat: "Structure métallique", notes: "Longueur 3m" },
    { name: "Structure HT44 250cm", qty: 2, cat: "Structure métallique", notes: "Longueur 2.5m" },
    { name: "Structure HT44 200cm", qty: 8, cat: "Structure métallique", notes: "Longueur 2m" },
    { name: "Structure HT44 150cm", qty: 2, cat: "Structure métallique", notes: "Longueur 1.5m" },
    { name: "Structure HT44 100cm", qty: 4, cat: "Structure métallique", notes: "Longueur 1m" },
    { name: "Structure HT44 50cm", qty: 2, cat: "Structure métallique", notes: "Longueur 0.5m" }
];

async function seedHT44() {
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
                    storageLocation: { zone: 'Stock', shelving: 'Structure', shelf: 'HT44' }
                });
                await newItem.save();
            }
        }

        console.log('Structure HT44 Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedHT44();
