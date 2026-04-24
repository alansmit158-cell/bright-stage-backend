const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/GoogleCalendarService');

// 0. DEBUG: Check what is configured
router.get('/debug', (req, res) => {
    res.send(`
        <h1>Configuration Debug</h1>
        <p><strong>Client ID:</strong> ${process.env.GOOGLE_CLIENT_ID}</p>
        <p><strong>Redirect URI in .env:</strong> ${process.env.GOOGLE_REDIRECT_URI}</p>
        <p><em>This URI above MUST match exactly what is in your Google Cloud Console.</em></p>
    `);
});

// 1. Redirect to Google Auth
router.get('/auth', (req, res) => {
    const url = googleCalendarService.generateAuthUrl();
    res.redirect(url);
});

// 2. Callback: Get Code -> Get Token -> Create Calendar -> Show ID
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        // Exchange code for tokens
        const tokens = await googleCalendarService.getTokens(code);

        // Create the requested calendar immediately
        const calendarId = await googleCalendarService.createSecondaryCalendar(
            'Mon Calendrier de Projet',
            'Agenda dédié au suivi des tâches et des jalons du projet de développement.'
        );

        res.send(`
            <div style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #10b981;">Calendar Created Successfully!</h1>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block; text-align: left;">
                    <p><strong>Calendar ID:</strong> <br><code style="background: #e5e7eb; padding: 4px;">${calendarId}</code></p>
                    <hr>
                    <p><strong>Refesh Token:</strong> <br><code style="background: #e5e7eb; padding: 4px; word-break: break-all;">${tokens.refresh_token}</code></p>
                </div>
                <p>You can now close this window.</p>
            </div>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send(`<h1>Error</h1><pre>${err.message}</pre>`);
    }
});

module.exports = router;
