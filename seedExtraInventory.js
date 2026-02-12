const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const items = [
    { name: "Lyre Robe Pointe", brand: "Robe", model: "Pointe", category: "Lumière standard", quantity: 12, state: "Fonctionnel", rentalPricePerDay: 85 },
    { name: "Console MA Lightning GrandMA3", brand: "MA", model: "Compact XT", category: "Régie lumière", quantity: 1, state: "Fonctionnel", rentalPricePerDay: 450 },
    { name: "Enceinte d&b V8", brand: "d&b audiotechnik", model: "V8", category: "Sonorisation", quantity: 16, state: "Fonctionnel", rentalPricePerDay: 120 },
    { name: "Amplificateur d&b D80", brand: "d&b audiotechnik", model: "D80", category: "Accessoires son", quantity: 4, state: "Fonctionnel", rentalPricePerDay: 90 },
    { name: "Console Yamaha CL5", brand: "Yamaha", model: "CL5", category: "Régie son", quantity: 1, state: "Fonctionnel", rentalPricePerDay: 350 },
    { name: "Pratiquable 2x1m", brand: "Staging", model: "Standard", category: "Scène", quantity: 20, state: "Fonctionnel", rentalPricePerDay: 15 },
    { name: "Rideau Led 6x4m", brand: "ShowLED", model: "Classic", category: "Tissus & bâches", quantity: 2, state: "Fonctionnel", rentalPricePerDay: 200 }
];

const seedExtraInventory = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB...");

        for (const item of items) {
            const exists = await InventoryItem.findOne({ name: item.name });
            if (!exists) {
                await InventoryItem.create(item);
                console.log(`Added: ${item.name}`);
            }
        }

        console.log("✅ Internal inventory enriched!");
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

seedExtraInventory();
