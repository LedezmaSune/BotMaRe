module.exports = {
    name: "Pronóstico del Clima",
    description: "Obtén el clima actual de cualquier ciudad. Uso: !clima [ciudad]",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        const match = text.match(/^([!./#])?(clima|tiempo)\s+(.+)$/i);
        
        if (!match) return;

        const city = match[3].trim();
        await api.reply(`🌤️ Buscando el clima para *${city}*...`);

        try {
            // 1. Obtener coordenadas (Geocoding API de Open-Meteo, 100% gratis)
            const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`);
            
            if (!geoRes.data.results || geoRes.data.results.length === 0) {
                return await api.reply(`❌ No pude encontrar la ciudad: *${city}*. Intenta con otro nombre.`);
            }

            const location = geoRes.data.results[0];
            const lat = location.latitude;
            const lon = location.longitude;
            const locName = `${location.name}, ${location.country}`;

            // 2. Obtener el clima
            const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const weather = weatherRes.data.current_weather;

            // Determinar emoji según el código de clima (WMO code)
            const code = weather.weathercode;
            let icon = "🌤️";
            if (code === 0) icon = "☀️"; // Despejado
            else if (code >= 1 && code <= 3) icon = "⛅"; // Parcialmente nublado
            else if (code >= 45 && code <= 48) icon = "🌫️"; // Niebla
            else if (code >= 51 && code <= 67) icon = "🌧️"; // Lluvia
            else if (code >= 71 && code <= 77) icon = "❄️"; // Nieve
            else if (code >= 80 && code <= 82) icon = "🌦️"; // Chubascos
            else if (code >= 95 && code <= 99) icon = "⛈️"; // Tormenta

            const resultText = `╭━━━ ${icon} *CLIMA ACTUAL* ━━━╮\n` +
                               `┃ 📍 *Ubicación:* ${locName}\n` +
                               `┃ 🌡️ *Temperatura:* ${weather.temperature}°C\n` +
                               `┃ 💨 *Viento:* ${weather.windspeed} km/h\n` +
                               `╰━━━━━━━━━━━━━━━━━━━━━╯`;

            await api.reply(resultText);

        } catch (error) {
            console.error("Error en Plugin Clima:", error.message);
            await api.reply("❌ Ocurrió un error al consultar el clima. Intenta de nuevo más tarde.");
        }
    }
};
