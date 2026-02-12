const mongoose = require('mongoose');
const Project = require('./models/Project');
const InventoryItem = require('./models/InventoryItem');

// Configuration
const API_URL = 'http://localhost:5000/api';

async function testEngagementFlow() {
    try {
        console.log('--- Starting Engagement Flow Test ---');
        require('dotenv').config();

        // Connect to Mongo
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Cleanup
        await Project.deleteMany({ eventName: 'TEST_ENGAGEMENT' });

        // Get Item
        const item = await InventoryItem.findOne();
        if (!item) throw new Error('No inventory items found. Please add at least one item.');

        // Create Quote
        const quote = new Project({
            eventName: 'TEST_ENGAGEMENT',
            status: 'Quote',
            financials: { totalExclTax: 1000, totalTax: 190, totalInclTax: 1190 },
            client: { name: 'Test Client', email: 'test@example.com' },
            dates: { start: new Date(), end: new Date() },
            items: [{ inventoryItem: item._id, name: item.name, quantity: 5, price: 100 }]
        });
        await quote.save();
        console.log(`Created Quote: ${quote._id}`);

        // Call API
        console.log(`Calling POST /api/public/quotes/${quote._id}/accept ...`);
        const response = await fetch(`${API_URL}/public/quotes/${quote._id}/accept`, {
            method: 'POST'
        });

        const data = await response.json();
        console.log('Response:', data);

        if (response.ok) {
            console.log('✅ Quote Accepted via API');
        } else {
            console.error('❌ API Failed (Status ' + response.status + ')');
        }

        // Verify DB
        const updated = await Project.findById(quote._id);
        if (updated.status === 'Confirmed') console.log('✅ Status: Confirmed');
        else console.error(`❌ Status: ${updated.status}`);

        const Invoice = require('./models/Invoice');
        const inv = await Invoice.findOne({ relatedProject: quote._id });
        if (inv) console.log(`✅ Invoice: ${inv.number} (Amount: ${inv.financials.totalInclTax})`);
        else console.error('❌ Invoice missing');

        const Reservation = require('./models/Reservation');
        const resCount = await Reservation.countDocuments({ project: quote._id });
        if (resCount > 0) console.log(`✅ Reservations: ${resCount}`);
        else console.error('❌ Reservations missing');

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}
testEngagementFlow();
