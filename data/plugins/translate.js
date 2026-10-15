/**
 * 🌐 Plugin: Traductor Multilingüe (IA)
 * Traduce textos o mensajes citados a cualquier idioma.
 * Uso: !traducir [idioma] [texto] o responder a un mensaje con !traducir [idioma]
 */

module.exports = {
    name: "Traductor Multilingüe",
    description: "Traduce texto entre múltiples idiomas. Uso: !traducir [idioma] [texto]",
    active: true,

    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const match = text.match(/^[!./#]?(traducir|traductor|translate)\b\s*([\s\S]*)$/i);
        if (!match) return;

        let args = (match[2] || "").trim();
        let targetLang = "inglés";
        let textToTranslate = "";

        const langMap = {
            'en': 'inglés',
            'es': 'español',
            'fr': 'francés',
            'pt': 'portugués',
            'it': 'italiano',
            'de': 'alemán',
            'ja': 'japonés',
            'zh': 'chino',
            'ru': 'ruso',
            'ar': 'árabe',
            'ko': 'coreano'
        };

        if (args) {
            const firstWord = args.split(/\s+/)[0].toLowerCase();
            if (langMap[firstWord]) {
                targetLang = langMap[firstWord];
                textToTranslate = args.substring(firstWord.length).trim();
            } else if (['ingles', 'inglés', 'español', 'espanol', 'frances', 'francés', 'portugues', 'portugués', 'italiano', 'aleman', 'alemán', 'japones', 'japonés'].includes(firstWord)) {
                targetLang = firstWord;
                textToTranslate = args.substring(firstWord.length).trim();
            } else {
                textToTranslate = args;
            }
        }

        // Si no hay texto directo pero está citando un mensaje
        if (!textToTranslate && ctx.quoted) {
            textToTranslate = ctx.quoted.conversation || 
                              ctx.quoted.extendedTextMessage?.text || 
                              ctx.quoted.imageMessage?.caption || 
                              ctx.quoted.videoMessage?.caption || 
                              "";
        }

        if (!textToTranslate) {
            await api.reply(
                "🌐 *Traductor Multilingüe*\n\n" +
                "*Uso:* `!traducir [idioma] [texto]`\n" +
                "*Ejemplos:*\n" +
                "• `!traducir en Buenos días, ¿cómo estás hoy?`\n" +
                "• `!traducir es Welcome to our service`\n" +
                "• `!traducir fr Me gusta mucho aprender cosas nuevas`\n" +
                "• O responde a un mensaje con: `!traducir en`"
            );
            return true;
        }

        await api.react("🌐");

        try {
            // Opción 1: Usar IA de BotMaRe si está disponible
            if (typeof api.callAI === 'function') {
                const prompt = `Traduce de manera natural, idiomática y precisa el siguiente texto al idioma ${targetLang}. 
Conserva emojis, signos de puntuación y nombres propios. Devuelve ÚNICAMENTE la traducción final, sin notas ni explicaciones:

"""
${textToTranslate}
"""`;

                const translated = await api.callAI(
                    prompt,
                    "Eres un traductor profesional políglota de máxima precisión. Solo devuelves la traducción directa."
                );

                if (translated) {
                    await api.reply(`🌐 *Traducción (${targetLang}):*\n\n${translated.trim()}`);
                    return true;
                }
            }

            // Opción 2: Fallback con MyMemory Translate API
            const langPair = targetLang.toLowerCase().includes('ing') ? 'es|en' : 'en|es';
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${langPair}`;
            const res = await axios.get(apiUrl, { timeout: 8000 });
            const translatedText = res.data?.responseData?.translatedText;

            if (translatedText) {
                await api.reply(`🌐 *Traducción:*\n\n${translatedText}`);
            } else {
                await api.reply("❌ No se pudo traducir el texto proporcionado.");
            }
        } catch (error) {
            console.error('[translate] Error en traducción:', error.message);
            await api.reply("❌ Ocurrió un error al traducir el mensaje.");
        }

        return true;
    }
};
