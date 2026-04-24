const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const Vehicle = require('./models/Vehicle');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const seedLogistics = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clean Logistics (Optional: Remove if you want to keep existing)
        // await Driver.deleteMany({});
        // await Vehicle.deleteMany({});

        // 1. Tunisian Drivers
        const drivers = [
            { name: "Ahmed Ben Salah", cin: "09123456", licenseNumber: "23/54321", phone: "55 123 456", status: "Active" },
            { name: "Mohamed Dridi", cin: "08876543", licenseNumber: "19/87654", phone: "22 987 654", status: "Active" },
            { name: "Karim Tounsi", cin: "07555666", licenseNumber: "21/11223", phone: "98 111 222", status: "Active" }
        ];

        for (const d of drivers) {
            const exists = await Driver.findOne({ cin: d.cin });
            if (!exists) {
                await Driver.create(d);
                console.log(`Driver added: ${d.name}`);
            } else {
                console.log(`Driver already exists: ${d.name}`);
            }
        }

        // 2. Tunisian Vehicles
        const vehicles = [
            { plateNumber: "154 TN 8976", model: "Isuzu NPR", type: "Truck", capacityWeight: 3500, status: "Active" },
            { plateNumber: "201 TN 2233", model: "Peugeot Partner", type: "Van", capacityWeight: 800, status: "Active" },
            { plateNumber: "198 TN 5544", model: "Fiat Ducato", type: "Van", capacityWeight: 1400, status: "Active" },
            { plateNumber: "215 TN 1234", model: "Mercedes Actros", type: "Truck", capacityWeight: 18000, status: "Active" }
        ];

        for (const v of vehicles) {
            const exists = await Vehicle.findOne({ plateNumber: v.plateNumber });
            if (!exists) {
                await Vehicle.create(v);
                console.log(`Vehicle added: ${v.model} (${v.plateNumber})`);
            } else {
                console.log(`Vehicle already exists: ${v.plateNumber}`);
            }
        }

        console.log('LOGISTICS SEEDING COMPLETE');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedLogistics();
