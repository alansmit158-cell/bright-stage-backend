require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        for (const user of users) {
            // Fix invalid role
            if (user.role === 'Admin') {
                user.role = 'Founder';
                console.log(`Fixed role for ${user.email}: Admin -> Founder`);
            }

            // Reset password to password123 (both hashed and plain)
            user.password = hashedPassword;
            user.plainPassword = 'password123';
            await user.save();
            console.log(`Reset password for ${user.email} to: password123`);
        }

        console.log('\n✅ All users updated successfully!');
        console.log('All users can now login with password: password123');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
