const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');

dotenv.config();

const updateClient = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const updated = await Client.findOneAndUpdate(
            { customId: 'CUS-70' }, // Donia Deco from previous import
            {
                contactPerson: 'Mouna Annan',
                matriculeFiscal: '1136281/G/A/M/000',
                address: 'Residance Ksour k37, Ennasser 2',
                city: 'L\'Ariana',
                notes: 'Tunisia'
            },
            { new: true }
        );

        if (updated) {
            console.log('Successfully updated Donia Deco:', updated.name);
        } else {
            console.log('Client CUS-70 not found. Checking by name...');
            const updatedByName = await Client.findOneAndUpdate(
                { name: /Donia Deco/i },
                {
                    contactPerson: 'Mouna Annan',
                    matriculeFiscal: '1136281/G/A/M/000',
                    address: 'Residance Ksour k37, Ennasser 2',
                    city: 'L\'Ariana'
                },
                { new: true }
            );
            if (updatedByName) console.log('Successfully updated Donia Deco by name');
            else console.log('Client not found');
        }

        process.exit();
    } catch (error) {
        console.error('Error updating client:', error);
        process.exit(1);
    }
};

updateClient();
