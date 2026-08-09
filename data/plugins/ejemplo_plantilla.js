/**
 * 🦊 Plantilla Maestra de Plugin para BotMaRe
 * 
 * BotMaRe ejecuta los plugins en un entorno Sandbox (VM) seguro.
 * Cada archivo .js dentro de 'data/plugins/' se carga automáticamente.
 */

module.exports = {
    // Nombre descriptivo del plugin
    name: "Plantilla de Ejemplo",
    
    // Breve descripción de lo que hace (se muestra en el menú y panel web)
    description: "Plantilla base con ejemplos de comandos, multimedia y APIs externas.",
    
    // Estado del plugin (true = activo, false = pausado)
    active: true,

    /**
     * Función principal ejecutada al recibir cualquier mensaje en WhatsApp.
     * 
     * @param {Object} ctx - Contexto del mensaje entrante:
     *   @property {string} ctx.text - Texto del mensaje enviado por el usuario.
     *   @property {string} ctx.from - JID/Número del remitente o grupo (ej. 521...@s.whatsapp.net o ...@g.us).
     *   @property {boolean} ctx.isGroup - Indica si el mensaje proviene de un grupo (true/false).
     *   @property {string} ctx.pushName - Nombre de perfil de WhatsApp del usuario.
     *   @property {Object} ctx.quoted - Mensaje citado o respondido (si aplica).
     * 
     * @param {Object} api - Métodos de interacción con WhatsApp:
     *   @method api.reply(texto) - Envía un mensaje de texto al chat actual.
     *   @method api.sendTo(jid, texto) - Envía un mensaje de texto a un número/grupo específico.
     *   @method api.sendMedia(url, pieDeFoto, tipo) - Descarga y envía un archivo (tipo: 'image' | 'video' | 'audio' | 'document').
     *   @method api.getPlugins() - Devuelve el arreglo con los metadatos de todos los plugins instalados.
     */
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const senderName = ctx.pushName || "amigo";

        // =========================================================================
        // EJEMPLO 1: Comando con prefijo flexible (!ping, .ping, /ping, #ping)
        // =========================================================================
        const pingMatch = text.match(/^[!./#]?(ping|test|prueba)$/i);
        if (pingMatch) {
            await api.reply(`🏓 ¡Pong! Hola *${senderName}*, el bot está en línea y funcionando.`);
            return;
        }

        // =========================================================================
        // EJEMPLO 2: Envío de Imágenes y Multimedia (api.sendMedia)
        // =========================================================================
        const fotoMatch = text.match(/^[!./#]?(foto|imagen)$/i);
        if (fotoMatch) {
            await api.reply("⏳ Generando imagen...");
            const sampleImageUrl = "https://picsum.photos/800/600";
            await api.sendMedia(sampleImageUrl, "📸 Aquí tienes tu imagen generada.", "image");
            return;
        }

        // =========================================================================
        // EJEMPLO 3: Consumo de APIs Externas con Axios o Fetch (disponibles globalmente)
        // =========================================================================
        const chisteMatch = text.match(/^[!./#]?(chiste|broma)$/i);
        if (chisteMatch) {
            try {
                // 'axios' y 'fetch' ya están inyectados de forma global en el sandbox
                const response = await axios.get("https://v2.jokeapi.dev/joke/Any?lang=es&type=single");
                const chiste = response.data?.joke || "¿Qué hace una abeja en el gimnasio? ¡Zumba!";
                await api.reply(`😂 *Chiste:* \n\n${chiste}`);
            } catch (error) {
                await api.reply("❌ Ocurrió un error al consultar la API externa.");
            }
            return;
        }
    }
};
