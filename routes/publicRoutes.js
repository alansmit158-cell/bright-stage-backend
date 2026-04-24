const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const googleTranslationService = require('../services/GoogleTranslationService');

router.get('/ping', (req, res) => {
    res.json({ pong: true });
});

// Translation Route
router.post('/translate', async (req, res) => {
    try {
        const { text, targetLang } = req.body;
        if (!text || !targetLang) return res.status(400).json({ error: 'Missing text or targetLang' });

        const translated = await googleTranslationService.translateText(text, targetLang);
        res.json({ translatedText: translated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public Quote Routes
router.get('/quotes/:id', publicController.getPublicQuote);
router.post('/quotes/:id/accept', publicController.acceptQuote);

module.exports = router;
