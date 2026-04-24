require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Driver = require('./models/Driver');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        // 1. Create User
        const email = 'Hamidou1906@hotmail.fr';
        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists. Updating details...');
            user.name = 'Mohamed Zarrouk';
            user.phone = '+216 55 170 435';
            user.cin = '14330388';
            await user.save();
            console.log('User updated.');
        } else {
            console.log('Creating new user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('brightstage123', salt);

            user = new User({
                name: 'Mohamed Zarrouk',
                email: email,
                password: hashedPassword,
                plainPassword: 'brightstage123',
                role: 'Worker',
                isActive: true,
                phone: '+216 55 170 435',
                cin: '14330388',
                points: 0,
                pointsHistory: []
            });
            await user.save();
            console.log('User created successfully.');
        }

        // 2. Create Driver Entry
        const cin = '14330388';
        let driver = await Driver.findOne({ cin });

        if (driver) {
            console.log('Driver already exists. Updating details...');
            driver.name = 'Mohamed Zarrouk';
            driver.phone = '+216 55 170 435';
            driver.licenseNumber = cin; // Using CIN as license if not provided
            await driver.save();
            console.log('Driver updated.');
        } else {
            console.log('Creating new driver...');
            driver = new Driver({
                name: 'Mohamed Zarrouk',
                cin: cin,
                phone: '+216 55 170 435',
                licenseNumber: cin,
                status: 'Active'
            });
            await driver.save();
            console.log('Driver created successfully.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
