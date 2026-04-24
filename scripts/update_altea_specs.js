const mongoose = require('mongoose');
const InventoryItem = require('./models/InventoryItem');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const fullDescription = `CARACTÉRISTIQUES PRINCIPALES :
• Système portable 3 voies auto-alimenté (colonnes)
• Puissance : 2000W crête (1000W continu)
• SPL Max : 127 dB
• Subwoofer : 2 x 10" 
• Tête : 4 x 3" + 1 x 1" compression néodyme
• DSP 24 bits DAScontrol™ avec écran LCD
• Streaming Bluetooth : DASlink GM™
• Consommation : 1,5A à 230V

PERFORMANCES :
• Gamme de fréquences : 37 Hz - 20 kHz (-10 dB)
• Couverture : 100° H x 50° V

ÉLECTRONIQUE & CONNECTEURS :
• Entrées : 2 x XLR/TRS Combo (Micro/Ligne), 1 x Wireless Bluetooth, 1 x 1/4" TRS HI-Z, 1 x 3,5mm Mini Jack
• Sortie : 1 x XLR Mâle (Bouclage)
• Connecteur AC : powerCon NAC3FCA

BOÎTIER & DIMENSIONS :
• Construction : Polypropylène + Birch Plywood
• Dimensions (H x L x P) : 2000 x 360 x 445 mm
• Poids Net : 31,0 kg

LIVRAISON :
• Dimensions emballage : 678 x 565 x 708 mm
• Poids emballage : 39,0 kg`;

async function updateAlteaSpecs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await InventoryItem.updateOne(
            { name: "DAS Audio Altea-Duo 20A" },
            { $set: { notes: fullDescription } }
        );

        if (result.matchedCount > 0) {
            console.log('Successfully updated Altea-Duo-20A technical specs.');
        } else {
            console.log('Item "Altea-Duo-20A" not found in database.');
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
}

updateAlteaSpecs();
