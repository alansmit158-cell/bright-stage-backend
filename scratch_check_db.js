const mongoose = require('mongoose');
const DeliveryNote = require('./models/DeliveryNote');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bright-stage');
        const note = await DeliveryNote.findById('69ed27ce46947f239e050a8b');
        console.log("DATABASE_CHECK:", JSON.stringify(note, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
