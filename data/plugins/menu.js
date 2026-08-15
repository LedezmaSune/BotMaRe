module.exports = {
    name: "Menú Principal",
    description: "Muestra la lista de plugins activos",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim().toLowerCase();
        
        const isMenuCommand = text === '!menuplugin';
        
        // Si estamos en un grupo, permitimos llamar al menú mencionando al bot solo (ej. @bot, @ia, @botmare, etc.)
        const isGroupMention = ctx.isGroup && (
            text === '@bot' || 
            text === '@ia' || 
            text === '@ai' || 
            text === 'botmare' || 
            text === '@botmare' ||
            text.startsWith('@')
        );

        if (!isMenuCommand && !isGroupMention) {
            return; // Salir si no es el comando exacto ni la mención en grupo
        }
        
        // Obtener la lista de plugins activos excluyendo el menú mismo
        const plugins = api.getPlugins ? api.getPlugins() : [];
        const activePlugins = plugins.filter(p => p.active && p.id !== 'menu');

        let menuText = `╭━━━ 🤖 *PLUGINS BOTMARE* ━━━╮\n`;
        menuText += `┃ 🔹 *Total Activos:* ${activePlugins.length}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        activePlugins.forEach((plugin) => {
            // Extraer el comando de uso si está en la descripción (ej: Uso: !fb [link])
            const matchUso = plugin.description.match(/Uso:\s*([^\s]+)/i);
            const acronimo = matchUso ? matchUso[1] : `!${plugin.id}`;
            
            // Limpiar la descripción de la parte de "Uso: ..." para no ser redundante
            let desc = plugin.description.replace(/Uso:.*$/i, '').trim();
            if (desc.length > 50) desc = desc.substring(0, 47) + "..."; // Acortar si es muy larga
            
            menuText += `👉 *${acronimo}*\n`;
            menuText += `   _${plugin.name}_: ${desc}\n\n`;
        });

        menuText += `*Nota:* Puedes agregar tus propios plugins en 'data/plugins/'`;

        await api.reply(menuText);
    }
};
