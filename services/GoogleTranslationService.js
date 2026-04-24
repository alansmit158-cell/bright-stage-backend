const translate = require('@iamtraction/google-translate');

class GoogleTranslationService {
    constructor() {
        console.log("Initializing GoogleTranslationService (Free Version)...");
    }

    async translateText(text, targetLang) {
        try {
            if (!text) return "";

            // The library options: { to: 'en', from: 'auto' }
            const res = await translate(text, { to: targetLang });
            return res.text;
        } catch (error) {
            console.error("Translation Error:", error);
            // Fallback to original text if translation fails
            return text;
        }
    }
}

module.exports = new GoogleTranslationService();
