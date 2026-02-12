const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const itemNamesToRemove = [
    "Housse de transport BAGPACK-DUO",
    "Housse FUN-DUO20",
    "Plateau à roulettes PL-ALTEA-DUO-20A",
    "Transducteur 10MG (LF)",
    "Transducteur 3PN (MF)",
    "Section de remplacement ALTEA-DUO-20TOP",
    "Tube de remplacement ALTEA-DUO-POLE",
    "Module DSP-ALTEA-DUO-20",
    "Moteur de Compression M-27N (HF)",
    "Module d'alimentation MP-ALTEA-DUO-20",
    "Amplificateur S-PRO2"
];

async function removeAlteaDetails() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await InventoryItem.deleteMany({
            name: { $in: itemNamesToRemove }
        });

        console.log(`Successfully removed ${result.deletedCount} items.`);

        // Also clear notes from the main item if needed? The user didn't explicitly ask to remove the specs from the main item, 
        // but often if they want the details removed, they might want the main item back to its original state.
        // However, I'll stick to what was explicitly asked: removing the added items.

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

removeAlteaDetails();
