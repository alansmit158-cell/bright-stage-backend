const mongoose = require('mongoose');
const SubcontractedItem = require('./models/SubcontractedItem');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const testItems = [
    {
        name: 'Ecran LED P2.9 Outdoor',
        brand: 'Absen',
        model: 'PL2.9',
        category: 'Vidéo',
        quantity: 50,
        costPerDay: 45,
        provider: 'Global Events Pro',
        notes: 'Dalles 500x500mm'
    },
    {
        name: 'Pack Sonorisation Line Array',
        brand: 'L-Acoustics',
        model: 'Kara II',
        category: 'Sonorisation',
        quantity: 12,
        costPerDay: 150,
        provider: 'AudioRent TN',
        notes: 'Comprend le bumper'
    },
    {
        name: 'Lyre Beam 350',
        brand: 'Clay Paky',
        model: 'Sharpy',
        category: 'Lumière',
        quantity: 24,
        costPerDay: 35,
        provider: 'Light Partnership',
        notes: 'Flightcase de 2'
    },
    {
        name: 'Groupe Électrogène 100kVA',
        brand: 'Caterpillar',
        model: 'C4.4',
        category: 'Énergie',
        quantity: 1,
        costPerDay: 450,
        provider: 'Power Rental Sarl',
        notes: 'Full fuel included'
    },
    {
        name: 'Structure Aluminium Noire 3m',
        brand: 'Prolyte',
        model: 'H30V Black',
        category: 'Structure',
        quantity: 10,
        costPerDay: 15,
        provider: 'Truss Masters',
        notes: 'Finition Mate'
    }
];

const seedSubcontracted = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB for Seeding...");

        // Clear existing to refresh categories
        await SubcontractedItem.deleteMany({});

        await SubcontractedItem.insertMany(testItems);
        console.log("✅ Re-seeded subcontracted items successfully!");

    } catch (err) {
        console.error("Error seeding subcontracted items:", err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

seedSubcontracted();
