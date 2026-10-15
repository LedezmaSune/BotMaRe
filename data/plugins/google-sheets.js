/**
 * 📊 Plugin: Consultor de Google Sheets
 * Consulta e inspecciona hojas de cálculo de Google Sheets públicas o compartidas.
 * Uso: !sheets [enlace de google sheets]
 */

module.exports = {
    name: "Google Sheets",
    description: "Inspecciona y consulta hojas de cálculo públicas de Google Sheets. Uso: !sheets [url]",
    active: true,

    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const match = text.match(/^[!./#]?(sheets|hojas|gsheet)\b\s*([\s\S]*)$/i);
        if (!match) return;

        let input = (match[2] || "").trim();

        // Buscar URL de sheets en el mensaje o cita
        const sheetRegex = /(https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+)/i;
        let sheetMatch = input.match(sheetRegex);

        if (!sheetMatch && ctx.quoted) {
            const quotedText = ctx.quoted.conversation || ctx.quoted.extendedTextMessage?.text || "";
            sheetMatch = quotedText.match(sheetRegex);
        }

        if (!sheetMatch) {
            await api.reply(
                "📊 *Consultor de Google Sheets*\n\n" +
                "Permite consultar rápidamente el contenido de cualquier hoja de cálculo compartida.\n\n" +
                "*Uso:* `!sheets <enlace_de_google_sheets>`\n\n" +
                "*Ejemplo:*\n" +
                "`!sheets https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`\n\n" +
                "💡 _Asegúrate de que el documento esté configurado con acceso: \"Cualquier persona con el enlace (Lector)\"._"
            );
            return true;
        }

        const baseUrl = sheetMatch[1];
        const idMatch = baseUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
        const spreadsheetId = idMatch ? idMatch[1] : null;

        if (!spreadsheetId) {
            await api.reply("❌ No se pudo extraer el identificador de la hoja de cálculo.");
            return true;
        }

        await api.react("📊");

        try {
            // Intentar descargar en formato CSV directo
            const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
            const response = await axios.get(csvExportUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const csvData = typeof response.data === 'string' ? response.data : '';

            if (csvData.includes('<!DOCTYPE html') || csvData.includes('<html')) {
                await api.reply(
                    "🔒 *Hoja de cálculo privada*\n\n" +
                    "Google devolvió una página de acceso denegado. Para poder consultarla, abre tu archivo en Google Drive, haz clic en *Compartir* y cambia el acceso a: *\"Cualquiera con el enlace\" (Lector)*."
                );
                return true;
            }

            const rows = csvData.split('\n').map(r => r.trim()).filter(Boolean);
            if (rows.length === 0) {
                await api.reply("📄 La hoja de cálculo parece estar vacía.");
                return true;
            }

            // Parsear filas básicas respetando comillas
            const parseCSVLine = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const c = line[i];
                    if (c === '"') inQuotes = !inQuotes;
                    else if (c === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else current += c;
                }
                result.push(current.trim());
                return result;
            };

            const headers = parseCSVLine(rows[0]);
            const dataRows = rows.slice(1, 6).map(parseCSVLine);

            let previewText = `📊 *Resumen de Google Sheets*\n\n`;
            previewText += `📌 *Total de filas registradas:* ${rows.length - 1}\n`;
            previewText += `📋 *Columnas detectadas:* ${headers.join(' | ')}\n\n`;
            previewText += `🔍 *Primeras ${Math.min(dataRows.length, 5)} filas de muestra:*\n`;

            dataRows.forEach((row, idx) => {
                const rowSummary = row.slice(0, 3).join(' • ');
                previewText += `  ${idx + 1}. ${rowSummary}\n`;
            });

            previewText += `\n🔗 *Enlace:* ${baseUrl}`;

            await api.reply(previewText);
        } catch (error) {
            console.error('[google-sheets] Error consultando hoja:', error.message);
            await api.reply(
                `⚠️ No se pudo consultar la hoja de cálculo:\n${error.message}\nVerifica que esté configurada con acceso público de lectura.`
            );
        }

        return true;
    }
};
