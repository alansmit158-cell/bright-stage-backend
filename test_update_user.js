require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        const email = 'ahmedaftitaa@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Found user: ${user.name}`);
            console.log(`Current Phone: ${user.phone}`);
            console.log(`Current CIN: ${user.cin}`);

            // Update
            user.phone = '12345678';
            user.cin = '00000000';
            await user.save();
            console.log('Updated user directly via Mongoose.');

            // Verify
            const updatedUser = await User.findOne({ email });
            console.log(`New Phone: ${updatedUser.phone}`);
            console.log(`New CIN: ${updatedUser.cin}`);
        } else {
            console.log('User not found.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
