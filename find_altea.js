const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function findAltea() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const items = await InventoryItem.find({ name: /Altea/i });
        console.log('Found items:', items.map(i => i.name));
        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        mongoose.disconnect();
    }
}

findAltea();
