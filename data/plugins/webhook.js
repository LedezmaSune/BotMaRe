/**
 * ⚡ Plugin: Integrador Webhook (HTTP POST)
 * Permite enviar eventos y datos desde WhatsApp hacia cualquier Webhook externo (n8n, Make, Zapier, Servidor propio).
 * Uso: !webhook <url> [mensaje o json]
 */

module.exports = {
    name: "Integrador Webhook",
    description: "Envía datos a webhooks externos (n8n, Make, Zapier). Uso: !webhook [url] [datos]",
    active: true,

    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!text) return;

        const match = text.match(/^[!./#]?(webhook|hook|notify)\b\s*([\s\S]*)$/i);
        if (!match) return;

        const rawArgs = (match[2] || "").trim();

        if (!rawArgs) {
            await api.reply(
                "⚡ *Integrador de Webhooks*\n\n" +
                "Envía información en tiempo real a tus endpoints HTTP externos.\n\n" +
                "*Uso:* `!webhook <URL> [mensaje opcional]`\n\n" +
                "*Ejemplo:*\n" +
                "`!webhook https://webhook.site/mi-token Nuevo lead registrado`"
            );
            return true;
        }

        const parts = rawArgs.split(/\s+/);
        const targetUrl = parts[0];
        const payloadText = rawArgs.substring(targetUrl.length).trim() || "Evento disparado desde WhatsApp";

        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            await api.reply("❌ La URL del webhook debe comenzar con `http://` o `https://`.");
            return true;
        }

        await api.react("⚡");

        const startTime = Date.now();
        try {
            let dataToSend = {
                event: "whatsapp_message_trigger",
                from: ctx.from,
                sender: ctx.sender || ctx.from.split('@')[0],
                pushName: ctx.pushName || "Desconocido",
                isGroup: Boolean(ctx.isGroup),
                message: payloadText,
                timestamp: new Date().toISOString()
            };

            // Si el usuario envió un string que es JSON válido, parsearlo e incluirlo
            if (payloadText.startsWith('{') && payloadText.endsWith('}')) {
                try {
                    const parsedJson = JSON.parse(payloadText);
                    dataToSend = { ...dataToSend, payload: parsedJson };
                } catch (e) {}
            }

            const response = await api.httpPost(targetUrl, dataToSend, {
                timeoutMs: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'BotMaRe-Webhook-Dispatcher/2.5'
                }
            });

            const duration = Date.now() - startTime;
            const status = response.status;

            await api.reply(
                `✅ *Webhook Ejecutado con Éxito*\n\n` +
                `🎯 *Destino:* \`${targetUrl.substring(0, 45)}...\`\n` +
                `📊 *Código HTTP:* \`${status} ${response.statusText || 'OK'}\`\n` +
                `⏱️ *Tiempo:* \`${duration} ms\`\n` +
                `📦 *Datos enviados:* \`${JSON.stringify(dataToSend.message)}\``
            );
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('[webhook] Error al despachar webhook:', error.message);
            const status = error.response ? error.response.status : 'Error de Conexión';
            await api.reply(
                `❌ *Fallo al Enviar Webhook*\n\n` +
                `🎯 *Destino:* \`${targetUrl}\`\n` +
                `📊 *Estado:* \`${status}\`\n` +
                `⚠️ *Detalle:* ${error.message}\n` +
                `⏱️ *Tiempo:* \`${duration} ms\``
            );
        }

        return true;
    }
};
