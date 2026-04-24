const { google } = require('googleapis');

/**
 * Service for Google Calendar Interactions
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env
 */
class GoogleCalendarService {
    constructor() {
        console.log("Initializing GoogleCalendarService...");
        console.log("CLIENT_ID available:", !!process.env.GOOGLE_CLIENT_ID);
        console.log("CLIENT_SECRET available:", !!process.env.GOOGLE_CLIENT_SECRET);
        console.log("REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);

        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        if (process.env.GOOGLE_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
            console.log("Google Calendar: Refresh Token Loaded");
        }
    }

    generateAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar'],
        });
    }

    async getTokens(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    /**
     * Creates a new secondary calendar.
     * @param {string} summary - The title of the calendar (e.g. 'Mon Calendrier de Projet')
     * @param {string} description - Description of the calendar
     * @param {string} timeZone - TimeZone (e.g. 'Europe/Paris')
     * @returns {Promise<string>} - The ID of the created calendar
     */
    async createSecondaryCalendar(summary, description, timeZone = 'Europe/Paris') {
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        try {
            const response = await calendar.calendars.insert({
                requestBody: { summary, description, timeZone }
            });
            return response.data.id;
        } catch (error) {
            console.error('Error creating calendar:', error);
            throw error;
        }
    }

    /**
     * Adds a Project Event to the configured calendar
     */
    async addProjectEvent(project) {
        if (!process.env.GOOGLE_CALENDAR_ID) {
            console.log("Skipping Calendar Sync: No Calendar ID configured.");
            return;
        }

        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const event = {
            summary: `PROJET: ${project.projectName}`,
            location: project.siteInfo?.address || 'Unknown Location',
            description: `Status: ${project.status}\nClient: ${project.clientInfo?.name || 'N/A'}\nNotes: ${project.notes || ''}`,
            start: {
                dateTime: project.dates.start, // Ensure this is ISO string
                timeZone: 'Europe/Paris',
            },
            end: {
                dateTime: project.dates.end,
                timeZone: 'Europe/Paris',
            },
            colorId: '11' // Red for visibility
        };

        try {
            const res = await calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                requestBody: event,
            });
            console.log(`[CALENDAR] Event created: ${res.data.htmlLink}`);
            return res.data;
        } catch (err) {
            console.error('[CALENDAR] Error creating event:', err.message);
            if (err.message && err.message.includes('invalid_grant')) {
                console.warn('[CALENDAR] Token expired or revoked. Please re-authenticate.');
                // Optionally: Trigger a notification to admin or update a DB flag
            }
            // CRITICAL: We consume the error here so the calling function (Project Save) does NOT fail.
            return null;
        }
    }
}

module.exports = new GoogleCalendarService();
