module.exports = {
    name: "Buscador de Películas (IMDb)",
    description: "Busca info de películas y series en IMDb. Uso: !imdb [pelicula]",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        const match = text.match(/^([!./#])?(imdb|peli|pelicula|movie)\s+(.+)$/i);
        
        if (!match) return;

        // Comprobar si configuraron la API Key en data/api-keys.json
        const apiKey = global.APIKeys?.OMDB || "tu_apikey_gratis_de_omdbapi_com";
        if (apiKey === "tu_apikey_gratis_de_omdbapi_com" || !apiKey) {
            return await api.reply("⚠️ *Aviso:* Para usar el buscador de películas, necesitas obtener una API Key gratuita en https://www.omdbapi.com/ y colocarla en el archivo `data/api-keys.json`.");
        }

        const query = match[3].trim();
        await api.reply(`🍿 Buscando información sobre *${query}*...`);

        try {
            const res = await axios.get(`http://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(query)}&plot=short`);
            const data = res.data;

            if (data.Response === "False") {
                return await api.reply(`❌ No pude encontrar ninguna película o serie llamada *${query}*.`);
            }

            let msg = `╭━━━ 🎬 *IMDb: ${data.Title}* ━━━╮\n`;
            msg += `┃ 📅 *Año:* ${data.Year}\n`;
            msg += `┃ 🌟 *Puntuación:* ${data.imdbRating}/10\n`;
            msg += `┃ 🎭 *Género:* ${data.Genre}\n`;
            msg += `┃ 🎬 *Director:* ${data.Director}\n`;
            msg += `┃ ⏱️ *Duración:* ${data.Runtime}\n`;
            msg += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            msg += `📝 *Trama:* ${data.Plot}\n`;

            // Si tiene póster, enviamos el póster con el texto
            if (data.Poster && data.Poster !== "N/A") {
                await api.sendMedia(data.Poster, msg, 'image');
            } else {
                await api.reply(msg);
            }

        } catch (error) {
            console.error("Error en Plugin IMDb:", error.message);
            await api.reply("❌ Ocurrió un error al conectar con IMDb.");
        }
    }
};
