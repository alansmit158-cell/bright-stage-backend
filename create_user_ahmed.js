require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        const email = 'ahmedaftitaa@gmail.com';
        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists. Updating details...');
            user.role = 'Site Manager';
            user.name = 'Ahmed Ftita'; // Update name
            await user.save();
            console.log('User updated: Ahmed Ftita');
        } else {
            console.log('Creating new user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            user = new User({
                name: 'Ahmed Ftita',
                email: email,
                password: hashedPassword,
                plainPassword: 'password123',
                role: 'Site Manager',
                isActive: true,
                points: 0,
                pointsHistory: []
            });
            await user.save();
            console.log('User created successfully: Ahmed Aftita (Site Manager)');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
