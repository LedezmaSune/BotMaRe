module.exports = {
    name: "Menú Principal",
    description: "Muestra la lista de plugins activos",
    active: true,
    onMessage: async (ctx, api) => {
        const text = ctx.text || "";
        
        // --- CONFIGURACIÓN DE PREFIJOS ---
        // Puedes agregar o quitar prefijos aquí
        const prefixes = ["!", ".", "/", "#"];
        
        // Verificar si el texto empieza con alguno de los prefijos y la palabra 'menu', 'help', o 'ayuda'
        const prefixRegex = new RegExp(`^([${prefixes.join('\\')}])?(menu|help|ayuda)$`, "i");
        const match = text.trim().match(prefixRegex);
        
        if (!match) return; // Si no es comando de menú, salir
        
        const usedPrefix = match[1] || ""; // El prefijo que se usó (puede estar vacío si se configuró sin prefijo)

        // Obtener la lista de plugins desde la nueva API
        const plugins = api.getPlugins ? api.getPlugins() : [];
        const activePlugins = plugins.filter(p => p.active);

        let menuText = `╭━━━ 🤖 *MENÚ BOTMARE* ━━━╮\n`;
        menuText += `┃ 🔹 *Prefijo usado:* ${usedPrefix || "(Ninguno)"}\n`;
        menuText += `┃ 🔹 *Total Plugins:* ${activePlugins.length}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        menuText += `*📚 PLUGINS DISPONIBLES:*\n`;
        
        activePlugins.forEach((plugin, index) => {
            menuText += `\n*${index + 1}. ${plugin.name}*\n`;
            menuText += `> 📝 ${plugin.description}\n`;
        });

        menuText += `\n*Nota:* Configura más plugins en la carpeta 'data/plugins/'`;

        await api.reply(menuText);
    }
};
