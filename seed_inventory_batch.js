const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem'); // Adjust path if needed
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    // Lights
    { name: "Beam 480", qty: 10, cat: "Lumière standard", notes: "10 pièces dans 5 Flycases (2 par Flycase)" },
    { name: "P2", qty: 10, cat: "Lumière standard", notes: "10 pièces dans 3 Flycases (4, 4, 2)" },
    { name: "Découpe", qty: 4, cat: "Lumière théâtrale", notes: "4 pièces dans 1 Flycase" },
    { name: "Sunstripe", qty: 12, cat: "Lumière standard", notes: "12 pièces dans 2 Flycases (6 par Flycase)" },
    { name: "Briteck", qty: 6, cat: "Lumière standard", notes: "Sans Flycase" },
    { name: "Admirale", qty: 4, cat: "Lumière standard", notes: "Sans Flycase" },
    { name: "Palco", qty: 10, cat: "Lumière standard", notes: "10 pièces dans 3 Flycases (4, 4, 2)" },
    { name: "Mantice", qty: 4, cat: "Lumière standard", notes: "4 pièces dans 2 Flycases (2 par Flycase)" },
    { name: "Poursuite", qty: 1, cat: "Lumière théâtrale", notes: "1 pièce dans 1 Flycase" },
    { name: "VL", qty: 4, cat: "Lumière standard", notes: "4 pièces dans 2 Flycases (2 par Flycase)" },
    { name: "Spot 1200", qty: 2, cat: "Lumière standard", notes: "2 pièces dans 2 Flycases (1 par Flycase)" },
    { name: "Citycolor", qty: 1, cat: "Lumière standard", notes: "1 pièce dans 1 Flycase" },
    { name: "COB", qty: 6, cat: "Lumière standard", notes: "6 pièces dans 2 Flycases (4, 2)" },
    { name: "Par LED Rechargeable", qty: 48, cat: "Lumière rechargeable", notes: "48 pièces dans 8 Flycases (6 par Flycase)" },
    { name: "Barre LED Rechargeable", qty: 20, cat: "Lumière rechargeable", notes: "20 pièces dans 5 Flycases (4 par Flycase)" },
    { name: "Par Rechargeable Omni Light Noire", qty: 15, cat: "Lumière rechargeable", notes: "15 pièces dans 2 Flycases (8, 7)" },

    // Machines
    { name: "Machine à Fumée Lourde", qty: 2, cat: "Machines de scène", notes: "2 pièces dans 2 Flycases (1 par Flycase)" },
    { name: "Haze Machine", qty: 1, cat: "Machines de scène", notes: "1 pièce dans 1 Flycase" },
    { name: "Machine à Étincelles", qty: 4, cat: "Machines de scène", notes: "4 pièces dans 2 Flycases (2 par Flycase)" },
    { name: "Bubble Fog Machine", qty: 1, cat: "Machines de scène", notes: "1 pièce" },
    { name: "Bubble Machine", qty: 1, cat: "Machines de scène", notes: "1 pièce" },
    { name: "Machine à Confettis", qty: 1, cat: "Machines de scène", notes: "1 pièce" },

    // Control / Regie
    { name: "Mini Console DMX Omnilight JW-40", qty: 2, cat: "Régie lumière", notes: "2 pièces" },
    { name: "Mini Console DMX WiFi", qty: 2, cat: "Régie lumière", notes: "2 pièces" },
    { name: "Table DMX APC40", qty: 1, cat: "Régie lumière", notes: "1 pièce" },
    { name: "GrandMA3", qty: 1, cat: "Régie lumière", notes: "1 pièce dans 1 Flycase" },
    { name: "Booster DMX", qty: 4, cat: "Câblage DMX", notes: "4 pièces Sans Flycase" },
    { name: "Sunlite Suite 2 O", qty: 3, cat: "Régie lumière", notes: "3 pièces" },
    { name: "Sunlite Suite 2 N", qty: 2, cat: "Régie lumière", notes: "2 pièces" }
];

async function seedBatch() {
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
                    state: 'Fonctionnel', // FIXED: 'status' -> 'state'
                    ownership: 'Bright Stage',
                    type: 'Rent',
                    storageLocation: { zone: 'Lumière', shelving: 'General', shelf: '1' } // Default
                });
                await newItem.save();
            }
        }

        console.log('Batch Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedBatch();
