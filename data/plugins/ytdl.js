module.exports = {
    name: "YouTube Downloader",
    description: "Descarga videos (MP4) o audios (MP3) de YouTube. Uso: !ytmp4 [link] o !ytmp3 [link]",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        const match = text.match(/^([!./#])?(ytmp3|ytmp4|yt|youtube)\s+(.+)$/i);
        
        if (!match) return;

        const command = match[2].toLowerCase();
        const url = match[3].trim();
        
        if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
            return await api.reply("❌ Por favor, envía un enlace válido de YouTube.");
        }

        const isAudio = command === 'ytmp3' || command === 'yt';
        const format = isAudio ? 'audio' : 'video';
        
        await api.reply(`⏳ Procesando ${isAudio ? 'Audio (MP3)' : 'Video (MP4)'} de YouTube... Esto puede tomar unos segundos.`);

        try {
            // Ryzendesu API para YouTube
            const apiUrl = global.APIs?.Ryzendesu || "https://api.ryzendesu.vip";
            const endpoint = isAudio ? '/api/downloader/ytmp3' : '/api/downloader/ytmp4';
            
            const res = await axios.get(`${apiUrl}${endpoint}?url=${encodeURIComponent(url)}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (res.data && res.data.url) {
                const mediaUrl = res.data.url;
                const title = res.data.title || "YouTube Media";

                // Enviamos el archivo
                await api.sendMedia(mediaUrl, `▶️ *${title}*`, format);
            } else {
                // Fallback a otra estructura de respuesta común
                if (res.data && res.data.data && res.data.data.url) {
                    await api.sendMedia(res.data.data.url, `▶️ *YouTube Download*`, format);
                } else {
                    throw new Error("No se encontró la URL en la respuesta");
                }
            }
        } catch (error) {
            console.error("Error en YouTube DL:", error.message);
            // Fallback a API Delirius si Ryzendesu falla
            try {
                const altApi = global.APIs?.Delirius || "https://delirius-apiofc.vercel.app";
                const altEndpoint = isAudio ? 'ytmp3' : 'ytmp4';
                const altRes = await axios.get(`${altApi}/download/${altEndpoint}?url=${encodeURIComponent(url)}`);
                
                if (altRes.data && altRes.data.data && altRes.data.data.download) {
                    await api.sendMedia(altRes.data.data.download, `▶️ *YouTube Download*`, format);
                } else {
                    await api.reply(`❌ Ocurrió un error al descargar el ${format}. Intenta más tarde.`);
                }
            } catch (altError) {
                await api.reply(`❌ Los servidores de descarga de YouTube están saturados. Intenta de nuevo en unos minutos.`);
            }
        }
    }
};
