const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    {
        name: "Processeur Novastar VX400",
        qty: 2,
        brand: "NOVASTAR",
        model: "VX400",
        cat: "Régie image",
        notes: "Processeur Vidéo All-in-One"
    },
    {
        name: "Média Serveur",
        qty: 2,
        cat: "Régie image",
        notes: "Serveur de diffusion vidéo"
    },
    {
        name: "Flycase Accessoires LED",
        qty: 4,
        cat: "Accessoires image",
        notes: "Pour accessoires écran LED (Câblage, Hardware)"
    }
];

async function seedLEDControl() {
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
                    storageLocation: { zone: 'Stock', shelving: 'Video', shelf: 'Control' }
                });
                await newItem.save();
            }
        }

        console.log('LED Control & Cases Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedLEDControl();
