const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function debugUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Searching for user containing "wahijilani"...');
        const users = await User.find({
            $or: [
                { name: /wahijilani/i },
                { email: /wahijilani/i }
            ]
        });

        if (users.length === 0) {
            console.log('No user found matching "wahijilani".');
        } else {
            console.log('Found users:');
            users.forEach(u => {
                console.log(`- Name: ${u.name}`);
                console.log(`  Email: ${u.email}`);
                console.log(`  Role: ${u.role}`);
                console.log(`  isActive: ${u.isActive}`);
                console.log(`  plainPassword: ${u.plainPassword || 'N/A'}`);
                console.log('-------------------');
            });
        }
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

debugUser();
