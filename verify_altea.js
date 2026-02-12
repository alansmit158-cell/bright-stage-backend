const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function verifyAltea() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const item = await InventoryItem.findOne({ name: "DAS Audio Altea-Duo 20A" });
        console.log('Item found:', item.name);
        console.log('Notes content length:', item.notes.length);
        console.log('Notes preview:', item.notes.substring(0, 100) + '...');
        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        mongoose.disconnect();
    }
}

verifyAltea();
