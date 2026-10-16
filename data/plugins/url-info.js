/**
 * 🔗 Plugin: Inspector de Enlaces Web (URL Preview)
 * Obtiene el título, descripción e imagen representativa de cualquier enlace web.
 * Uso: !url [enlace] o !link [enlace]
 */

module.exports = {
    name: "Inspector de Enlaces",
    description: "Inspecciona y extrae metadatos de cualquier URL. Uso: !url [enlace]",
    active: true,

    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const match = text.match(/^[!./#]?(url|link|enlace|webinfo)\b\s*([\s\S]*)$/i);
        if (!match) return;

        let input = (match[2] || "").trim();

        // Buscar URL en el texto o en el mensaje citado
        const urlRegex = /(https?:\/\/[^\s]+)/i;
        let urlMatch = input.match(urlRegex);

        if (!urlMatch && ctx.quoted) {
            const quotedText = ctx.quoted.conversation || ctx.quoted.extendedTextMessage?.text || "";
            urlMatch = quotedText.match(urlRegex);
        }

        if (!urlMatch) {
            await api.reply(
                "🔗 *Inspector de Enlaces Web*\n\n" +
                "Por favor proporciona una URL válida.\n" +
                "*Ejemplo:* `!url https://es.wikipedia.org`\n" +
                "O cita un mensaje que contenga un enlace con `!url`."
            );
            return true;
        }

        const targetUrl = urlMatch[1];
        await api.react("🔗");

        try {
            const response = await api.httpGet(targetUrl, {
                timeoutMs: 10000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const html = typeof response.data === 'string' ? response.data : '';
            if (!html) {
                await api.reply(`🌐 *Enlace:* ${targetUrl}\n\nNo se pudo leer el contenido HTML de la página.`);
                return true;
            }

            // Extraer título
            let title = "";
            const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                               html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
            if (ogTitleMatch) title = ogTitleMatch[1];

            if (!title) {
                const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch) title = titleMatch[1];
            }

            // Extraer descripción
            let description = "";
            const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                               html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i);
            if (ogDescMatch) description = ogDescMatch[1];

            if (!description) {
                const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                                     html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
                if (metaDescMatch) description = metaDescMatch[1];
            }

            // Extraer imagen OG
            let ogImage = "";
            const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                              html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
            if (ogImgMatch) {
                ogImage = ogImgMatch[1];
                if (ogImage.startsWith('//')) ogImage = 'https:' + ogImage;
            }

            // Extraer nombre del sitio
            let siteName = "";
            const ogSiteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
            if (ogSiteMatch) siteName = ogSiteMatch[1];

            const parsedDomain = new URL(targetUrl).hostname;

            let card = `🌐 *${siteName || parsedDomain}*\n`;
            if (title) card += `📌 *Título:* ${title.trim()}\n\n`;
            if (description) card += `📄 *Descripción:* \n${description.trim()}\n\n`;
            card += `🔗 *Enlace:* ${targetUrl}`;

            if (ogImage && ogImage.startsWith('http')) {
                try {
                    await api.sendMedia(ogImage, card, "image");
                    return true;
                } catch (e) {
                    // Si falla el envío de la imagen, enviar el texto
                }
            }

            await api.reply(card);
        } catch (error) {
            console.error('[url-info] Error analizando enlace:', error.message);
            await api.reply(`⚠️ No se pudo obtener información previa del enlace:\n${targetUrl}\n(Error: ${error.message})`);
        }

        return true;
    }
};
