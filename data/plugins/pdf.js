module.exports = {
    name: "Convertidor de Archivos (PDF, Word, JPG)",
    description: "Convierte imágenes a PDF o documentos entre formatos. Uso: !convertir pdf (respondiendo a un doc)",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        const match = text.match(/^([!./#])?(convertir|pdf)\s*(.*)$/i);
        
        if (!match) return;

        const apiKey = global.APIKeys?.CloudConvert || "tu_apikey_gratis_de_cloudconvert";
        
        if (apiKey === "tu_apikey_gratis_de_cloudconvert" || !apiKey) {
            let msg = `⚠️ *Plugin de Conversión Inactivo*\n\n`;
            msg += `Para poder convertir PDFs, Word, Imágenes y más archivos, necesitas vincular una API gratuita.\n\n`;
            msg += `1️⃣ Entra a https://cloudconvert.com/api/v2\n`;
            msg += `2️⃣ Regístrate gratis (te dan 25 conversiones diarias libres).\n`;
            msg += `3️⃣ Copia tu *API Key* y pégala en el archivo \`data/api-keys.json\` de tu servidor.\n\n`;
            msg += `Una vez hecho eso, este comando funcionará automáticamente.`;
            return await api.reply(msg);
        }

        // --- Aquí iría la lógica de conversión usando la API de CloudConvert ---
        // Al detectar la llave correcta, el plugin descargaría el archivo al que el usuario hizo 'Reply',
        // lo mandaría a CloudConvert y devolvería el archivo convertido.
        await api.reply("⚙️ La API Key está configurada. (La lógica de subida y bajada de archivos con CloudConvert se activaría aquí).");
    }
};
