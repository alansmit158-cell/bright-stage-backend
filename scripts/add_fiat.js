const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Vehicle = require('./models/Vehicle');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const addVehicle = async () => {
    await connectDB();

    const vehicleData = {
        plateNumber: "234 TU 1503",
        model: "Fiat Ducato 2.2 HDI 8m3 L1H1",
        type: "Van",
        status: "Active",
        // Storing extra details in a way that fits or just omitting them if schema doesn't support
        // The current schema is strict, so we only add what fits.
    };

    try {
        const vehicle = await Vehicle.create(vehicleData);
        console.log('Vehicle Created:', vehicle);
    } catch (err) {
        if (err.code === 11000) {
            console.log('Vehicle already exists (Duplicate Plate Number)');
        } else {
            console.error('Error creating vehicle:', err);
        }
    }

    mongoose.connection.close();
};

addVehicle();
