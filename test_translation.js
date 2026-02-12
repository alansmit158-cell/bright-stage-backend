const translationService = require('./services/GoogleTranslationService');

async function testTranslation() {
    console.log('Testing Translation Service...');
    const text = "Hello, how are you?";
    const target = "fr";

    try {
        const result = await translationService.translateText(text, target);
        console.log(`Original: ${text}`);
        console.log(`Translated (${target}): ${result}`);

        if (result && result !== text) {
            console.log('✅ Translation works!');
        } else {
            console.log('⚠️ Translation returned same text (check if intended or failure)');
        }
    } catch (err) {
        console.error('❌ Translation Failed:', err);
    }
}

testTranslation();
