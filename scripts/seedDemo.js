const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const Project = require('./models/Project');
const MaintenanceTicket = require('./models/MaintenanceTicket');
const Client = require('./models/Client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing (optional, but good for consistent demo)
        // await InventoryItem.deleteMany({});
        // await Project.deleteMany({});
        // await MaintenanceTicket.deleteMany({});
        // await Client.deleteMany({});

        // 1. Create Clients
        const clients = [
            { name: "Global Events Co", email: "contact@globalevents.com", phone: "0102030405", companyParam: "GE-2024" },
            { name: "Festival Musique Lyon", email: "hello@festilyon.fr", phone: "0607080910", companyParam: "FML-2024" }
        ];
        const createdClients = await Client.insertMany(clients);
        console.log('Clients seeded');

        // 2. Create Inventory
        const inventory = [
            { name: "Martin MAC Aura", brand: "Martin", model: "XB", category: "Lumière standard", quantity: 24, state: "Fonctionnel", storageLocation: { zone: "A", shelving: "1" } },
            { name: "Shure SM58", brand: "Shure", model: "SM58", category: "Microphonie", quantity: 50, state: "Fonctionnel", storageLocation: { zone: "B", shelving: "2" } },
            { name: "Pioneer CDJ-3000", brand: "Pioneer", model: "CDJ-3000", category: "Régie son", quantity: 4, state: "Fonctionnel", storageLocation: { zone: "B", shelving: "3" } },
            { name: "Structure 3m", brand: "ProLyte", model: "H30V", category: "Structure métallique", quantity: 20, state: "Fonctionnel", storageLocation: { zone: "C", shelving: "1" } },
            { name: "Broken Cable", brand: "Generic", model: "XLR", category: "Câblage XLR", quantity: 5, state: "Cassé", storageLocation: { zone: "D", shelving: "1" } }
        ];
        const createdInventory = await InventoryItem.insertMany(inventory);
        console.log('Inventory seeded');

        // 3. Create Project
        const project = new Project({
            projectName: "Festival Été 2026",
            eventName: "Festival Été 2026", // Required field added
            clientId: createdClients[1]._id,
            status: "Confirmed",
            dates: {
                start: new Date(new Date().setDate(new Date().getDate() + 7)), // Next week
                end: new Date(new Date().setDate(new Date().getDate() + 10))
            },
            siteInfo: { address: "Parc de la Tête d'Or, Lyon" },
            items: [
                { inventoryItem: createdInventory[0]._id, name: "Martin MAC Aura", quantity: 12 },
                { inventoryItem: createdInventory[2]._id, name: "Pioneer CDJ-3000", quantity: 2 }
            ]
        });
        await project.save();
        console.log('Project seeded');

        // 4. Create Maintenance Ticket
        const ticket = new MaintenanceTicket({
            inventoryItem: createdInventory[4]._id,
            itemParams: { name: "Broken Cable", reference: createdInventory[4]._id.toString() },
            reportedBy: "Technicien A",
            severity: "Medium",
            issueDescription: "Câble sectionné",
            status: "Open"
        });
        await ticket.save();
        console.log('Maintenance Ticket seeded');

        console.log('SEEDING COMPLETE');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
