const mongoose = require('mongoose');

// Vercel Serverless Caching Pattern
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

// Global Mongoose Configuration
mongoose.set('bufferCommands', false); // Fail fast, don't buffer when disconnected

async function connectDB() {
    if (cached.conn) {
        console.log('Using cached MongoDB connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Don't buffer commands when offline, fail fast
            serverSelectionTimeoutMS: 5000,
            family: 4
        };

        console.log('Creating new MongoDB connection...');
        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log('MongoDB Connected Successfully');
    } catch (e) {
        cached.promise = null;
        console.error('MongoDB Connection Check Failed:', e);
        throw e;
    }

    return cached.conn;
}

module.exports = connectDB;
