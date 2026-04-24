const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'jilani.wahi@gmail.com';
        const newPassword = 'brightstage123';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const user = await User.findOneAndUpdate(
            { email },
            {
                password: hashedPassword,
                plainPassword: newPassword // For admin view context
            },
            { new: true }
        );

        if (user) {
            console.log(`Password reset for user: ${user.name}`);
            console.log(`New Login Credentials:`);
            console.log(`Email: ${user.email}`);
            console.log(`Password: ${newPassword}`);
        } else {
            console.log('User not found.');
        }
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

resetPassword();
