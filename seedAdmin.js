const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const existingAdmin = await User.findOne({ email: 'admin@brightstage.com' });
        if (existingAdmin) {
            console.log("Admin already exists (admin@brightstage.com)");
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin', salt);

        const admin = new User({
            name: 'System Admin',
            email: 'admin@brightstage.com',
            password: hashedPassword,
            role: 'Founder', // Use Founder role to ensure full access
            isActive: true,
            points: 1000
        });

        await admin.save();
        console.log("Admin User Created Successfully");
        console.log("Email: admin@brightstage.com");
        console.log("Password: admin");
    } catch (err) {
        console.error("Error seeding admin:", err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

seedAdmin();
