const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const InventoryItem = require('./models/InventoryItem');
const Flycase = require('./models/Flycase');

const generateFlycases = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const items = await InventoryItem.find({}, 'name quantity notes _id');
        let createdCount = 0;

        for (const item of items) {
            if (!item.notes) continue;

            const note = item.notes;
            let flycaseCount = 0;
            let capacity = 0;

            // Pattern 1: "10 pièces dans 5 Flycases (2 par Flycase)"
            // Regex: (\d+) pièces dans (\d+) Flycases \((\d+) par Flycase\)
            const match1 = note.match(/(\d+)\s*pièces?\s*dans\s*(\d+)\s*Flycases?\s*\((\d+)\s*par\s*Flycase\)/i);

            // Pattern 2: "Conditionné par 6 en Flight Case (8 Flight Cases Total)"
            // Regex: Conditionné par (\d+) en Flight Case \((\d+) Flight Cases Total\)
            const match2 = note.match(/Conditionné\s*par\s*(\d+)\s*en\s*Flight\s*Case\s*\((\d+)\s*Flight\s*Cases\s*Total\)/i);

            // Pattern 3: "1 pièce dans 1 Flycase"
            const match3 = note.match(/(\d+)\s*pièce\s*dans\s*1\s*Flycase/i);


            if (match1) {
                flycaseCount = parseInt(match1[2]);
                capacity = parseInt(match1[3]);
            } else if (match2) {
                flycaseCount = parseInt(match2[2]);
                capacity = parseInt(match2[1]);
            } else if (match3) {
                flycaseCount = 1;
                capacity = 1;
            } else {
                // Try simpler heuristic?
                // "Sans Flycase" -> Skip
                if (note.includes("Sans Flycase")) continue;

                // "12 pièces dans 2 Flycases" -> infer capacity
                const match4 = note.match(/(\d+)\s*pièces?\s*dans\s*(\d+)\s*Flycases?/i);
                if (match4) {
                    const totalItems = parseInt(match4[1]);
                    flycaseCount = parseInt(match4[2]);
                    capacity = Math.ceil(totalItems / flycaseCount);
                }
            }

            if (flycaseCount > 0) {
                console.log(`\nProcessing: ${item.name} | Note: "${note}"`);
                console.log(`-> Creating ${flycaseCount} Flycases (Capacity: ${capacity})`);

                // Create Flycases
                for (let i = 1; i <= flycaseCount; i++) {
                    // Generate ID: FC-{ITEM_First_3_Chars}-{Index}
                    // Better verify uniqueness: FC-BEAM480-01
                    const shortName = item.name.replace(/\s+/g, '').substring(0, 6).toUpperCase();
                    const qrId = `FC-${shortName}-${String(i).padStart(2, '0')}`;

                    // Check if exists
                    const exists = await Flycase.findOne({ qrCodeID: qrId });
                    if (exists) {
                        console.log(`   - ${qrId} already exists. Skipping.`);
                        continue;
                    }

                    await Flycase.create({
                        qrCodeID: qrId,
                        equipment: item._id, // Using InventoryItem ID directly since schema allows ObjectId but check ref
                        // Wait, schema ref is 'Equipment'. But InventoryItem is the main collection.
                        // If I use InventoryItem ID, populate('equipment') might fail if it expects 'Equipment' model.
                        // However, 'check_flycases.js' worked with 'InventoryItem' require? No, populate failed for Equipment schema.
                        // The existing flycases (Beam 300) might point to an Equipment doc, OR maybe InventoryItem IS an Equipment?
                        // Let's assume InventoryItem ID is fine for now, or check if we need to link content.
                        // Actually, 'InventoryItem' usually *replaced* 'Equipment' in earlier refactors?
                        // Let's assume passing item._id is correct for linking.
                        capacity: capacity,
                        serializedContent: [],
                        status: 'Available'
                    });
                    console.log(`   + Created: ${qrId}`);
                    createdCount++;
                }
            }
        }

        console.log(`\n--- Completed. Created ${createdCount} Flycases. ---`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        mongoose.connection.close();
    }
};

generateFlycases();
