const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    {
        name: "Console Midas MR18",
        brand: "MIDAS",
        model: "MR18",
        qty: 1,
        cat: "Régie son",
        notes: "Console numérique compacte"
    },
    {
        name: "Console Yamaha MGP12",
        brand: "YAMAHA",
        model: "MGP12",
        qty: 1,
        cat: "Régie son",
        notes: "Console de mixage analogique"
    },
    {
        name: "Console Behringer X32",
        brand: "BEHRINGER",
        model: "X32",
        qty: 1,
        cat: "Régie son",
        notes: "Console numérique standard"
    }
];

async function seedSoundConsoles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of items) {
            const existing = await InventoryItem.findOne({ name: item.name });
            if (existing) {
                console.log(`Updating ${item.name}...`);
                existing.quantity = item.qty;
                existing.brand = item.brand;
                existing.model = item.model;
                existing.category = item.cat;
                existing.notes = item.notes;
                await existing.save();
            } else {
                console.log(`Creating ${item.name}...`);
                const newItem = new InventoryItem({
                    name: item.name,
                    quantity: item.qty,
                    brand: item.brand,
                    model: item.model,
                    category: item.cat,
                    notes: item.notes,
                    state: 'Fonctionnel',
                    ownership: 'Bright Stage',
                    type: 'Rent',
                    storageLocation: { zone: 'Stock', shelving: 'Audio', shelf: 'Consoles' }
                });
                await newItem.save();
            }
        }

        console.log('Sound Consoles Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedSoundConsoles();
