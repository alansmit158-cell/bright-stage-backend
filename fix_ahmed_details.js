require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(async () => {
        console.log('Connected to MongoDB');

        const email = 'ahmedaftitaa@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Updating details for ${user.name}...`);
            // Values from user screenshot
            user.phone = '+21651852270';
            user.cin = '14526955';
            await user.save();
            console.log('User details updated successfully.');
        } else {
            console.log('User not found.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
