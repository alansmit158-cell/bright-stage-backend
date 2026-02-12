const mongoose = require('mongoose');
const Freelancer = require('./models/Freelancer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const seedFreelancers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const freelancers = [
            { name: "Sami Jlassi", specialty: "Sound Engineer", dailyRate: 250, phone: "50 111 222", email: "sami.sound@example.com", cin: "05666777", status: "Active" },
            { name: "Rym Ben Ali", specialty: "Lighting Technician", dailyRate: 200, phone: "22 333 444", email: "rym.light@example.com", cin: "07888999", status: "Active" },
            { name: "Youssef Gharbi", specialty: "Stagehand", dailyRate: 120, phone: "98 555 666", cin: "09000111", status: "Active" },
            { name: "Nadia Tlili", specialty: "Video Operator", dailyRate: 300, phone: "55 777 888", email: "nadia.video@example.com", cin: "04222333", status: "Active" }
        ];

        for (const f of freelancers) {
            const exists = await Freelancer.findOne({ cin: f.cin });
            if (!exists) {
                await Freelancer.create(f);
                console.log(`Freelancer added: ${f.name}`);
            } else {
                console.log(`Freelancer already exists: ${f.name}`);
            }
        }

        console.log('FREELANCER SEEDING COMPLETE');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedFreelancers();
