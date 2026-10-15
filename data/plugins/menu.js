module.exports = {
    name: "Menú Principal",
    description: "Muestra la lista completa de comandos y plugins activos. Uso: !menup",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim().toLowerCase();
        
        // Soporta !menup, menup, .menup, /menup, !menu, !comandos, !help, !ayuda
        const isMenuCommand = /^[!./#]?(menup|menuplugin|menu|comandos|help|ayuda)$/i.test(text);
        
        // Si estamos en un grupo, permitimos llamar al menú mencionando explícitamente al bot
        const isGroupMention = ctx.isGroup && (
            text === '@bot' || 
            text === '@ia' || 
            text === '@ai' || 
            text === 'botmare' || 
            text === '@botmare'
        );

        if (!isMenuCommand && !isGroupMention) {
            return false;
        }

        // Obtener la lista de plugins activos excluyendo el menú mismo
        const plugins = api.getPlugins ? api.getPlugins() : [];
        const activePlugins = plugins.filter(p => p.active && p.id !== 'menu');

        let menuText = `╭━━━ 🤖 *PLUGINS BOTMARE* ━━━╮\n`;
        menuText += `┃ 🔹 *Plugins Activos:* ${activePlugins.length}\n`;
        menuText += `┃ ⚡ *Prefijos válidos:* \`!\`, \`.\`, \`/\`, \`#\`\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        menuText += `🧠 *INTELIGENCIA ARTIFICIAL Y PRODUCTIVIDAD*\n`;
        menuText += `• *!resumir [texto o cita]*\n  _Resume textos largos o mensajes citados con IA_\n`;
        menuText += `• *!traducir [idioma] [texto]*\n  _Traduce a inglés, francés, etc. con IA_\n`;
        menuText += `• *!google [consulta]*\n  _Búsqueda web con Wikipedia y síntesis IA_\n`;
        menuText += `• *!url [enlace]*\n  _Inspector y vista previa de páginas web_\n`;
        menuText += `• *!sheets [url]*\n  _Inspecciona hojas de Google Sheets compartidas_\n\n`;

        menuText += `📥 *DESCARGAS MULTIMEDIA*\n`;
        menuText += `• *!ytmp3 / !ytmp4 [enlace]*\n  _Descarga audio MP3 o video MP4 de YouTube_\n`;
        menuText += `• *!tiktok [enlace]*\n  _Descarga videos de TikTok sin marca de agua_\n`;
        menuText += `• *!fb [enlace]*\n  _Descarga videos, Reels y Shorts de Facebook_\n`;
        menuText += `• *!ig [enlace]*\n  _Descarga Reels, fotos y posts de Instagram_\n`;
        menuText += `• *!tw [enlace]*\n  _Descarga videos y fotos de Twitter / X_\n\n`;

        menuText += `🛠️ *UTILIDADES Y APIS*\n`;
        menuText += `• *!clima [ciudad]*\n  _Pronóstico del tiempo y temperatura actual_\n`;
        menuText += `• *!imdb [película]*\n  _Ficha técnica y puntuación de películas y series_\n`;
        menuText += `• *!webhook [url] [datos]*\n  _Dispara HTTP POST en tiempo real hacia n8n/Make_\n`;
        menuText += `• *!ping*\n  _Comprueba estado y latencia del bot_\n`;
        menuText += `• *!chiste*\n  _Cuenta un chiste aleatorio en español_\n`;
        menuText += `• *!foto*\n  _Genera una imagen de muestra_\n`;
        menuText += `• *!convertir pdf*\n  _Conversor de formatos de documentos_\n\n`;

        menuText += `⚙️ *ADMINISTRACIÓN (Solo Administrador)*\n`;
        menuText += `• *!lista*\n  _Menú interactivo de control de acceso (Whitelist/Blacklist)_\n\n`;

        menuText += `👤 *ATENCIÓN HUMANA (Handoff)*\n`;
        menuText += `• Escribe *asesor*, *humano* o *soporte* para pausar la IA y contactar a un asesor.\n\n`;

        // Si existen plugins adicionales que no están en la lista estándar, los mostramos dinámicamente
        const standardIds = [
            'menu', 'google-search', 'summarize-text', 'translate', 'url-info',
            'google-sheets', 'webhook', 'clima', 'fbdl', 'igdl', 'tiktokdl',
            'twitterdl', 'ytdl', 'pdf', 'imdb', 'ejemplo_plantilla'
        ];
        const customPlugins = activePlugins.filter(p => !standardIds.includes(p.id));

        if (customPlugins.length > 0) {
            menuText += `🧩 *OTROS PLUGINS INSTALADOS*\n`;
            customPlugins.forEach(p => {
                const matchUso = p.description.match(/Uso:\s*([^\s]+)/i);
                const acronimo = matchUso ? matchUso[1] : `!${p.id}`;
                menuText += `• *${acronimo}* - _${p.name}_\n`;
            });
            menuText += `\n`;
        }

        menuText += `💡 _Para volver a ver este menú en cualquier momento escribe *!menup*_`;

        await api.reply(menuText);
        return true;
    }
};
