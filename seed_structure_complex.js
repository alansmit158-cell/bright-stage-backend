const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    // --- Structure PT34 (Linear) ---
    { name: "Structure PT34 100cm", qty: 13, cat: "Structure métallique", notes: "13x 1M" },
    { name: "Structure PT34 50cm", qty: 12, cat: "Structure métallique", notes: "12x 0.5M" },
    { name: "Structure PT34 10cm", qty: 4, cat: "Structure métallique", notes: "4x 0.10M" },

    // --- Structure PT34 (Angles & Circles) ---
    { name: "Angle PT34 172.5°", qty: 8, cat: "Structure métallique", notes: "8x ANGLE 172.5" },
    { name: "Cube PT34 6 Directions", qty: 14, cat: "Structure métallique", notes: "14x CUBE 6 DIRECTION" },
    { name: "Angle PT34-C30 (3 Départs)", qty: 4, cat: "Structure métallique", notes: "4x COIN 3 DIRECTION PT34-C30" },
    { name: "Angle PT34-C21 (2 Départs)", qty: 4, cat: "Structure métallique", notes: "4x COIN 2 DIRECTION PT34-C21" },
    { name: "Cercle PT33 3m", qty: 1, cat: "Structure métallique", notes: "1x CERCLE 3 M PT33" },
    { name: "Cercle Structure 5m", qty: 1, cat: "Structure métallique", notes: "1x CERCLE DE DIAMÈTRE 5M" },

    // --- Components / Accessories ---
    { name: "Tête de Tour PT34", qty: 12, cat: "Accessoires structure", notes: "12x TETE DE TOURS" },
    { name: "Palan à Chaîne", qty: 12, cat: "Accessoires structure", notes: "12x PALLON A CHAINE" },
    { name: "Embase Lourde 75cm", qty: 8, cat: "Accessoires structure", notes: "8x EMBASSE 0.75 M" },
    { name: "Embase Légère 75cm", qty: 2, cat: "Accessoires structure", notes: "2x EMBASSE LEGER 0.75 M" },
    { name: "Embase Mobile", qty: 8, cat: "Accessoires structure", notes: "8x EMBASSE MOBILE" },
    { name: "Chariot Mobile PT34", qty: 4, cat: "Accessoires structure", notes: "4x CHARIOT MOBILE PT34" },
    { name: "Chariot Mobile Mixte (2xPT34 / 2xHT44)", qty: 4, cat: "Accessoires structure", notes: "4x CHARIOT MOBILE 2 COTE PT34 ET 2 COTE HT44" },
    { name: "Chariot Mobile Universel (4xPT34 / 4xHT44)", qty: 4, cat: "Accessoires structure", notes: "4x CHARIOT MOBILE LES 4 COTE HAVE PT34 ET HT44" },
    { name: "Plateforme PT34", qty: 6, cat: "Accessoires structure", notes: "6x PLATEFORMES PT34" },
    { name: "Manchon Charnière", qty: 48, cat: "Accessoires structure", notes: "48x MANCHANT CHARNIERE" },

    // --- Monotube ---
    { name: "Monotube 250cm", qty: 2, cat: "Structure métallique", notes: "2x 2.5M" },
    { name: "Monotube 200cm", qty: 8, cat: "Structure métallique", notes: "8x 2M" },
    { name: "Monotube 150cm", qty: 6, cat: "Structure métallique", notes: "6x 1.5M" },
    { name: "Monotube 100cm", qty: 11, cat: "Structure métallique", notes: "11x 1M" },
    { name: "Monotube 55cm", qty: 4, cat: "Structure métallique", notes: "4x 0.55M" },
    { name: "Embase Monotube", qty: 10, cat: "Accessoires structure", notes: "10x EMBASSE MONOTUBE" }
];

async function seedComplexStructure() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of items) {
            const existing = await InventoryItem.findOne({ name: item.name });
            if (existing) {
                console.log(`Updating ${item.name}...`);
                existing.quantity = item.qty;
                existing.category = item.cat;
                existing.notes = item.notes; // Update notes to reflect latest import details
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
                    storageLocation: { zone: 'Stock', shelving: 'Structure', shelf: 'Complex' }
                });
                await newItem.save();
            }
        }

        console.log('Complex Structure Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedComplexStructure();
