const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'jilani.wahi@gmail.com';
        const user = await User.findOne({ email });
        if (user) {
            console.log('User found:', user.name, user.role);
        } else {
            console.log('User NOT found. Seeding admin...');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
check();
