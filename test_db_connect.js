require('dotenv').config();
const mongoose = require('mongoose');

console.log("Testing MongoDB Connection...");
console.log("URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ Successfully connected to MongoDB!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Connection failed:", err);
        process.exit(1);
    });
