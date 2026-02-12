require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            // Fix invalid role
            // @ts-ignore
            if (user.role === 'Admin') {
                user.role = 'Founder';
                console.log(`Fixed role for ${user.email}: Admin -> Founder`);
            }

            // Add plainPassword if missing
            if (!user.plainPassword) {
                user.plainPassword = 'password123';
                await user.save();
                console.log(`Updated ${user.email} with plainPassword: password123`);
            } else {
                console.log(`${user.email} already has plainPassword: ${user.plainPassword}`);
            }
        }

        console.log('All users updated successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
