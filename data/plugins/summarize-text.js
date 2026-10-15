/**
 * 📝 Plugin: Resumidor de Textos (IA)
 * Resume textos largos o mensajes citados extrayendo los puntos clave.
 * Uso: !resumir [texto] o responder a un mensaje con !resumir
 */

module.exports = {
    name: "Resumidor de Textos",
    description: "Sintetiza textos o mensajes largos en puntos clave. Uso: !resumir [texto o cita]",
    active: true,

    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const match = text.match(/^[!./#]?(resumir|resumen|summarize)\b\s*([\s\S]*)$/i);
        if (!match) return;

        let contentToSummarize = (match[2] || "").trim();

        // Si no se incluyó texto después del comando, verificar si está citando un mensaje
        if (!contentToSummarize && ctx.quoted) {
            contentToSummarize = ctx.quoted.conversation || 
                                 ctx.quoted.extendedTextMessage?.text || 
                                 ctx.quoted.imageMessage?.caption || 
                                 ctx.quoted.videoMessage?.caption || 
                                 "";
        }

        if (!contentToSummarize) {
            await api.reply(
                "📝 *Resumidor Inteligente*\n\n" +
                "Puedes usar este comando de dos formas:\n" +
                "1️⃣ Escribiendo el texto: `!resumir [pega aquí tu texto largo]`\n" +
                "2️⃣ Respondiendo (citando) a cualquier mensaje largo con la palabra `!resumir`."
            );
            return true;
        }

        if (contentToSummarize.length < 30) {
            await api.reply("ℹ️ El texto proporcionado es muy corto para resumir. Por favor proporciona un texto más extenso.");
            return true;
        }

        await api.react("📝");

        try {
            if (typeof api.callAI === 'function') {
                const prompt = `Analiza el siguiente texto y proporciona:
1. Una idea principal (1 o 2 oraciones concisas).
2. Puntos clave más importantes en viñetas (máximo 4 o 5 viñetas).
3. Conclusión breve si aplica.

Texto a resumir:
"""
${contentToSummarize}
"""`;

                const summary = await api.callAI(
                    prompt,
                    "Eres un asistente analítico experto en síntesis y comprensión de lectura en español. Sé claro, directo y estructurado."
                );

                if (summary) {
                    await api.reply(`📋 *Resumen Ejecutivo:*\n\n${summary.trim()}`);
                    return true;
                }
            }

            // Fallback en caso de que callAI no devuelva contenido
            const sentences = contentToSummarize.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
            const firstFew = sentences.slice(0, 3).join('. ') + '.';
            await api.reply(`📋 *Extracto Inicial:*\n\n${firstFew}`);
        } catch (error) {
            console.error('[summarize-text] Error al resumir:', error.message);
            await api.reply("❌ Ocurrió un error al intentar resumir el texto. Por favor inténtalo de nuevo.");
        }

        return true;
    }
};
