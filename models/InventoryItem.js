const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    brand: { type: String },
    model: { type: String },
    serialNumbers: [{ type: String }],
    // Location & Advanced Specs
    storageLocation: {
        zone: { type: String, default: 'A' },
        shelving: { type: String, default: '1' },
        shelf: { type: String, default: '1' }
    },
    weight: { type: Number, default: 0 }, // Kg (for Transport)
    maintenanceQuantity: { type: Number, default: 0 }, // Sub-quantity broken
    outOfStorageLocation: { type: String },
    category: {
        type: String,
        enum: [
            'Accessoires image',
            'Accessoires lumière',
            'Accessoires son',
            'Accessoires structure',
            'Câblage DMX',
            'Câblage XLR',
            'Câblage réseau',
            'Câblage source',
            'Câblage électrique P17',
            'Câblage électrique PCE',
            'Câblage écran LED',
            'Distribution électrique',
            'Lumière rechargable',
            'Lumière standard',
            'Lumière théâtrale',
            'Machines de scène',
            'Informatique',
            'Équipement bureautique',
            'Microphonie',
            'Multiprises',
            'Outillage de maintenance',
            'Outillage de sécurité du site',
            'Outillage du personnel',
            'Outillage partagé',
            'Régie image',
            'Régie lumière',
            'Régie son',
            'Scène',
            'Sonorisation',
            'Structure métallique',
            'Tissus & bâches',
            'Téléviseurs',
            'Écran LED',
            'Véhicule Hybride',
            'Batterie Lithium',
            'Matériel Cinéma',

        ]
    },
    taxRate: { type: Number, enum: [0.07, 0.19], default: 0.19 },
    ownership: {
        type: String,
        enum: ['Bright Stage', 'Shared'],
        default: 'Bright Stage'
    },
    notes: { type: String },
    webLink: { type: String },
    // Financials
    purchasePrice: { type: Number, default: 0 }, // Cost price for margin calc
    type: {
        type: String,
        enum: ['Rent', 'Sale', 'Service'], // Rent = Stock, Sale = Consumable, Service = Labor/Transport
        default: 'Rent'
    },
    state: {
        type: String,
        enum: ['Fonctionnel', 'Pièces manquantes', 'Cassé', 'à vérifier', 'à réparer'],
        default: 'Fonctionnel'
    },
    rentalPricePerDay: { type: Number, default: 0 },
    barcode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
