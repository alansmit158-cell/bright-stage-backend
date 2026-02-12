const express = require('express');
const router = express.Router();
const SubcontractedItem = require('../models/SubcontractedItem');
const InventoryItem = require('../models/InventoryItem');

// GET all subcontracted items
router.get('/', async (req, res) => {
    try {
        const items = await SubcontractedItem.find().sort({ name: 1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new subcontracted item
router.post('/', async (req, res) => {
    const item = new SubcontractedItem(req.body);
    try {
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update subcontracted item
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await SubcontractedItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE subcontracted item
router.delete('/:id', async (req, res) => {
    try {
        await SubcontractedItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted Successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CONVERT to Internal Inventory
router.post('/:id/convert', async (req, res) => {
    try {
        const subItem = await SubcontractedItem.findById(req.params.id);
        if (!subItem) return res.status(404).json({ message: 'Item not found' });

        // Map subcontracted categories to valid Inventory enums if possible
        const categoryMapping = {
            'Vidéo': 'Écran LED',
            'Sonorisation': 'Sonorisation',
            'Lumière': 'Lumière standard',
            'Énergie': 'Distribution électrique',
            'Structure': 'Structure métallique'
        };

        console.log(`Converting item: ${subItem.name}, Category: "${subItem.category}"`);
        const validCategory = categoryMapping[subItem.category.trim()] || 'Lumière standard';
        console.log(`Mapped to category: "${validCategory}"`);

        // Create new Inventory Item
        const invItem = new InventoryItem({
            name: subItem.name,
            brand: subItem.brand,
            model: subItem.model,
            category: validCategory,
            quantity: subItem.quantity,
            state: 'Fonctionnel',
            rentalPricePerDay: subItem.costPerDay * 1.5, // Default markup example
            storageLocation: { zone: 'A', shelving: '1', shelf: '1' }
        });

        await invItem.save();
        await SubcontractedItem.findByIdAndDelete(req.params.id);

        res.json({ message: 'Successfully moved to inventory', inventoryItem: invItem });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
