/**
 * 🌐 Plugin: Búsqueda Web (Google / Wikipedia / DuckDuckGo)
 * Permite buscar información rápida en internet directamente desde WhatsApp.
 * Uso: !google <consulta> o !buscar <consulta>
 */

module.exports = {
    name: "Búsqueda Web",
    description: "Busca información rápida en internet. Uso: !google [consulta]",
    active: true,

    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const match = text.match(/^[!./#]?(google|buscar|search)\s*(.*)$/i);
        if (!match) return;

        const query = (match[2] || "").trim();

        if (!query) {
            await api.reply("🔍 *Búsqueda Web*\n\nPor favor ingresa lo que deseas buscar.\n*Ejemplo:* `!google Inteligencia Artificial` o `!buscar Clima en México`");
            return true;
        }

        await api.react("🔍");

        try {
            // Intento 1: DuckDuckGo Instant Answer API
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const ddgRes = await axios.get(ddgUrl, { timeout: 8000 });
            const data = ddgRes.data;

            let resultTitle = data.Heading || query;
            let resultText = data.AbstractText || "";
            let sourceUrl = data.AbstractURL || "";

            // Intento 2: Si DuckDuckGo no tiene texto directo, consultar Wikipedia en Español
            if (!resultText) {
                try {
                    const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
                    const wikiRes = await axios.get(wikiUrl, { timeout: 6000 });
                    if (wikiRes.data && wikiRes.data.extract) {
                        resultTitle = wikiRes.data.title || resultTitle;
                        resultText = wikiRes.data.extract;
                        sourceUrl = wikiRes.data.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(query)}`;
                    }
                } catch (e) {}
            }

            // Intento 3: Si aún no hay texto y api.callAI está disponible, generar síntesis con IA
            if (!resultText && typeof api.callAI === 'function') {
                const aiSummary = await api.callAI(
                    `Proporciona un resumen claro, verídico y conciso de no más de 3 párrafos sobre: "${query}". Incluye datos clave o contexto relevante.`,
                    "Eres un motor de búsqueda y conocimiento conciso. Proporciona información objetiva y precisa en español."
                );
                if (aiSummary) {
                    resultText = aiSummary.trim();
                }
            }

            if (resultText) {
                let response = `🔎 *Resultado para:* "${resultTitle}"\n\n`;
                response += `${resultText}\n\n`;
                if (sourceUrl) {
                    response += `🌐 *Fuente:* ${sourceUrl}\n`;
                }
                response += `\n_Para más información, puedes buscar directamente en Google:_ \nhttps://www.google.com/search?q=${encodeURIComponent(query)}`;

                await api.reply(response);
            } else {
                await api.reply(`🔍 No encontré información instantánea sobre *"${query}"*.\n\nPuedes consultar directamente aquí:\nhttps://www.google.com/search?q=${encodeURIComponent(query)}`);
            }
        } catch (error) {
            console.error('[google-search] Error al buscar:', error.message);
            await api.reply(`⚠️ No se pudo completar la búsqueda en este momento.\nPuedes consultar directamente en:\nhttps://www.google.com/search?q=${encodeURIComponent(query)}`);
        }

        return true;
    }
};
