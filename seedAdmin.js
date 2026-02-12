const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const existingAdmin = await User.findOne({ email: 'admin@brightstage.com' });
        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin', salt);

        const admin = new User({
            name: 'System Admin',
            email: 'admin@brightstage.com',
            password: hashedPassword,
            role: 'Admin',
            points: 1000
        });

        await admin.save();
        console.log("Admin User Created Successfully");
        console.log("Email: admin@brightstage.com");
        console.log("Password: admin");
    } catch (err) {
        console.error("Error seeding admin:", err);
    } finally {
        mongoose.connection.close();
    }
};

seedAdmin();
