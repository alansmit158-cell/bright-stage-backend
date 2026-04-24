const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    {
        name: "Link Courant LED (PowerCon)",
        qty: 96,
        cat: "Câblage écran LED",
        notes: "Power Link pour dalles LED"
    },
    {
        name: "Link Réseau LED (RJ45)",
        qty: 96,
        cat: "Câblage écran LED",
        notes: "Data Link pour dalles LED"
    },
    {
        name: "Alimentation PowerCon (Main)",
        qty: 7,
        cat: "Câblage écran LED",
        notes: "Câble d'alimentation principal (Power Cône)"
    }
];

async function seedLEDCabling() {
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
                    storageLocation: { zone: 'Stock', shelving: 'Video', shelf: 'Cabling' }
                });
                await newItem.save();
            }
        }

        console.log('LED Cabling Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedLEDCabling();
