const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({});
        console.log(`Total users: ${users.length}`);
        users.forEach(u => {
            console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, isActive: ${u.isActive}`);
        });
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

listUsers();
