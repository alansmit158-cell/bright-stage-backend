const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const items = [
    // --- Main Panels (Updating/Standardizing) ---
    {
        name: "LED display panel (écran LED) curved",
        qty: 48,
        brand: "UNILUMIN",
        model: "UGMII3-A",
        cat: "Écran LED",
        notes: "Module Incurvé 50x50cm"
    },
    {
        name: "LED display panel (écran LED) corner",
        qty: 48,
        brand: "UNILUMIN",
        model: "UGMII3-C",
        cat: "Écran LED",
        notes: "Module Angle 50x50cm"
    },

    // --- Spares ---
    {
        name: "LED Replacement Panel (Curved)",
        qty: 6,
        brand: "UNILUMIN",
        model: "UGMII3-A",
        cat: "Écran LED",
        notes: "Spare Parts"
    },
    {
        name: "LED Replacement Panel (Corner)",
        qty: 6,
        brand: "UNILUMIN",
        model: "UGMII3-C",
        cat: "Écran LED",
        notes: "Spare Parts"
    },
    {
        name: "LED receiving card (chip)",
        qty: 3,
        brand: "NOVASTAR",
        model: "A5s PLUS",
        cat: "Accessoires image",
        notes: "Spare Parts"
    },
    {
        name: "LED replacement power supply",
        qty: 3,
        brand: "UNILUMIN",
        model: "UNI-J250V4. 0A1D-EC",
        cat: "Accessoires image",
        notes: "Spare Parts"
    },

    // --- Rigging & Support ---
    {
        name: "FLY BAR écran LED (original) corner",
        qty: 8,
        brand: "UNILUMIN",
        model: "43A11-00003",
        cat: "Accessoires structure",
        notes: "Pour UGMII3-C"
    },
    {
        name: "FLY BAR écran LED (original) curved",
        qty: 8,
        brand: "UNILUMIN",
        model: "47503-Y0000126",
        cat: "Accessoires structure",
        notes: "Pour UGMII3-A"
    },
    {
        name: "Support écran LED Arrière",
        qty: 25,
        brand: "UNILUMIN",
        cat: "Accessoires structure",
        notes: "Back Support"
    },

    // --- Structure Fly Bars ---
    { name: "FLY BAR écran LED (Structure) 1M", qty: 4, cat: "Accessoires structure" },
    { name: "FLY BAR écran LED (Structure) 2M", qty: 1, cat: "Accessoires structure" },
    { name: "FLY BAR écran LED (Structure) 3M", qty: 1, cat: "Accessoires structure" },

    // --- Feet / Pieds ---
    { name: "Pied FLY BAR écran LED (Structure) 50cm", qty: 4, cat: "Accessoires structure" },
    { name: "Pied FLY BAR écran LED (Structure) 75cm", qty: 4, cat: "Accessoires structure" },
    { name: "Pied FLY BAR écran LED (Structure) 1M", qty: 4, cat: "Accessoires structure" } // From Image 1
];

async function seedDetailedLED() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of items) {
            // Find by name OR model to avoid duplicates if names slightly differ
            // STRICT MATCH BY NAME to distinguish between Main units and Spares with same model
            const query = { name: item.name };
            const existing = await InventoryItem.findOne(query);

            if (existing) {
                console.log(`Updating ${item.name}...`);
                existing.name = item.name; // Normalize name
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
                    storageLocation: { zone: 'Stock', shelving: 'Video', shelf: 'LED Accessories' }
                });
                await newItem.save();
            }
        }

        console.log('Detailed LED Inventory Seed Complete!');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

seedDetailedLED();
