const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public Quote Routes
router.get('/quotes/:id', publicController.getPublicQuote);
router.post('/quotes/:id/accept', publicController.acceptQuote);

module.exports = router;
