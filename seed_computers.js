const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    { name: "PC Pentium ASUS", brand: "ASUS", model: "Pentium", qty: 1, cat: "Informatique" },
    { name: "PC DELL", brand: "DELL", qty: 1, cat: "Informatique" },
    { name: "PC LENOVO Blue", brand: "LENOVO", notes: "Color: Blue", qty: 1, cat: "Informatique" },
    { name: "PC Gigabyte", brand: "GIGABYTE", qty: 1, cat: "Informatique" },
    { name: "PC LENOVO Gris", brand: "LENOVO", notes: "Color: Gris", qty: 1, cat: "Informatique" }
];

async function seedComputers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of items) {
            const existing = await InventoryItem.findOne({ name: item.name });
            if (existing) {
                console.log(`Updating ${item.name}...`);
                existing.quantity = item.qty;
                existing.brand = item.brand;
                existing.category = item.cat;
                existing.notes = item.notes;
                await existing.save();
            } else {
                console.log(`Creating ${item.name}...`);
                const newItem = new InventoryItem({
                    name: item.name,
                    quantity: item.qty,
                    brand: item.brand,
                    category: item.cat,
                    notes: item.notes,
                    state: 'Fonctionnel',
                    ownership: 'Bright Stage',
                    type: 'Rent',
                    storageLocation: { zone: 'Stock', shelving: 'Bureau', shelf: 'Informatique' }
                });
                await newItem.save();
            }
        }

        console.log('Computer Inventory Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedComputers();
