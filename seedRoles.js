const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const seedRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('Connected to MongoDB');

        const users = [
            { name: "Founder User", email: "founder@brightstage.com", role: "Founder", points: 50 },
            { name: "Manager User", email: "manager@brightstage.com", role: "Manager", points: 30 },
            { name: "Storekeeper User", email: "store@brightstage.com", role: "Storekeeper", points: 10 },
            { name: "Site Manager User", email: "site@brightstage.com", role: "Site Manager", points: 20 },
            { name: "Worker User", email: "worker@brightstage.com", role: "Worker", points: 100 }
        ];

        console.log("Seeding Users...");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        for (const u of users) {
            // Check if exists
            const exists = await User.findOne({ email: u.email });
            if (exists) {
                console.log(`Updated: ${u.role} (${u.email})`);
                exists.role = u.role; // Ensure role is updated if it existed with old enum
                exists.password = hashedPassword; // Reset pass just in case
                await exists.save();
            } else {
                console.log(`Created: ${u.role} (${u.email})`);
                const newUser = new User({
                    name: u.name,
                    email: u.email,
                    password: hashedPassword,
                    role: u.role,
                    points: u.points
                });
                await newUser.save();
            }
        }

        console.log("\n✅ All roles seeded successfully!");
        console.log("Password for all accounts: 123456");
        process.exit(0);

    } catch (err) {
        console.error("Error seeding roles:", err);
        process.exit(1);
    }
};

seedRoles();
