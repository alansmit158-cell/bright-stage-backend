const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    // --- Accessories ---
    {
        name: "Housse de transport BAGPACK-DUO",
        brand: "DAS Audio",
        model: "BAGPACK-DUO",
        qty: 4,
        cat: "Accessoires son",
        notes: "Accessoires de Transport pour Altea Duo-20A"
    },
    {
        name: "Housse FUN-DUO20",
        brand: "DAS Audio",
        model: "FUN-DUO20",
        qty: 4,
        cat: "Accessoires son",
        notes: "Accessoires de Transport (Protection)"
    },
    {
        name: "Plateau à roulettes PL-ALTEA-DUO-20A",
        brand: "DAS Audio",
        model: "PL-ALTEA-DUO-20A",
        qty: 2,
        cat: "Accessoires son",
        notes: "Accessoires de Transport (Chariot)"
    },
    // --- Spare Parts (Pièces Détachées) ---
    {
        name: "Transducteur 10MG (LF)",
        brand: "DAS Audio",
        model: "10MG",
        qty: 4,
        cat: "Accessoires son",
        notes: "Cône Transducteur pour Altea Duo"
    },
    {
        name: "Transducteur 3PN (MF)",
        brand: "DAS Audio",
        model: "3PN",
        qty: 8,
        cat: "Accessoires son",
        notes: "Cône Transducteur pour Altea Duo"
    },
    {
        name: "Section de remplacement ALTEA-DUO-20TOP",
        brand: "DAS Audio",
        model: "ALTEA-DUO-20TOP",
        qty: 2,
        cat: "Accessoires son",
        notes: "Tête de remplacement complète"
    },
    {
        name: "Tube de remplacement ALTEA-DUO-POLE",
        brand: "DAS Audio",
        model: "ALTEA-DUO-POLE",
        qty: 2,
        cat: "Accessoires son",
        notes: "Tube de liaison de remplacement"
    },
    {
        name: "Module DSP-ALTEA-DUO-20",
        brand: "DAS Audio",
        model: "DSP-ALTEA-DUO-20",
        qty: 2,
        cat: "Accessoires son",
        notes: "Module DSP de rechange"
    },
    {
        name: "Moteur de Compression M-27N (HF)",
        brand: "DAS Audio",
        model: "M-27N",
        qty: 2,
        cat: "Accessoires son",
        notes: "Moteur de compression au néodyme"
    },
    {
        name: "Module d'alimentation MP-ALTEA-DUO-20",
        brand: "DAS Audio",
        model: "MP-ALTEA-DUO-20",
        qty: 2,
        cat: "Accessoires son",
        notes: "Module d'alimentation de rechange"
    },
    {
        name: "Amplificateur S-PRO2",
        brand: "DAS Audio",
        model: "S-PRO2",
        qty: 1,
        cat: "Accessoires son",
        notes: "Amplificateur interne de rechange"
    }
];

const mainUpdate = {
    name: "DAS Audio Altea-Duo 20A",
    notes: "Système portable 3 voies auto-alimenté (format colonne). 2000W Peak, 127 dB SPL. 2x10\" Sub, 4x3\"+1\" MF/HF. DSP 24 bits, Bluetooth, DASlink GM."
};

async function seedAlteaDetails() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update Main Item
        console.log('Updating main Altea Duo info...');
        await InventoryItem.updateOne(
            { name: mainUpdate.name },
            { $set: { notes: mainUpdate.notes } }
        );

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
                    ...item,
                    category: item.cat, // Mapping cat to category
                    state: 'Fonctionnel',
                    ownership: 'Bright Stage',
                    type: 'Rent',
                    storageLocation: { zone: 'Stock', shelving: 'Audio', shelf: 'Spares' }
                });
                await newItem.save();
            }
        }

        console.log('Altea Duo Detailed Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedAlteaDetails();
