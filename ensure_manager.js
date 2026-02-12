require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const usersToSync = [
    {
        email: 'jilani.wahi@gmail.com',
        username: 'jilaniwahi',
        name: 'Jilani Wahi',
        role: 'Founder'
    },
    {
        email: 'dridijaalel@gmail.com',
        username: 'dridijaalel',
        name: 'Jalal',
        role: 'Manager'
    },
    {
        email: 'dridimedali14@gmail.com',
        username: 'dridimedali',
        name: 'Med Ali Dridi',
        role: 'Site Manager'
    },
    {
        email: 'doghri.khalil@gmail.com',
        username: 'doghrikhalil',
        name: 'Khalil Doghri',
        role: 'Storekeeper'
    }
];

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        for (const userData of usersToSync) {
            let user = await User.findOne({ email: userData.email });

            if (user) {
                console.log(`User found: ${user.email}, role: ${user.role}`);
                if (user.role !== userData.role) {
                    user.role = userData.role;
                    await user.save();
                    console.log(`Updated role to ${userData.role}`);
                }
            } else {
                console.log(`Creating ${userData.role}: ${userData.email}`);
                await new User({
                    username: userData.username,
                    name: userData.name,
                    email: userData.email,
                    password: 'password123',
                    plainPassword: 'password123',
                    role: userData.role,
                    isActive: true
                }).save();
                console.log(`Created ${userData.username} with default password: password123`);
            }
        }

        console.log('Database synchronization complete.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
