module.exports = {
    name: "TikTok Downloader",
    description: "Descarga videos de TikTok sin marca de agua. Uso: !tiktok [link]",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        const match = text.match(/^([!./#])?(tiktok|tt|ttdl)\s+(.+)$/i);
        
        if (!match) return;

        const url = match[3].trim();
        
        if (!url.includes("tiktok.com")) {
            return await api.reply("❌ Por favor, envía un enlace válido de TikTok.\nEjemplo: `!tiktok https://www.tiktok.com/@usuario/video/1234567890`");
        }

        await api.reply("⏳ Descargando video de TikTok sin marca de agua...");

        try {
            // Intentamos usar la API gratuita de Ryzendesu (muy usada en bots)
            const apiUrl = global.APIs?.Ryzendesu || "https://api.ryzendesu.vip";
            const res = await axios.get(`${apiUrl}/api/downloader/tiktok?url=${encodeURIComponent(url)}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (res.data && res.data.data) {
                // Ryzendesu suele devolver data.data.play o data.data.nowm para el video sin marca de agua
                const videoUrl = res.data.data.play || res.data.data.nowm || res.data.data.watermark;
                const title = res.data.data.title || "Video de TikTok";

                if (videoUrl) {
                    await api.sendMedia(videoUrl, `🎵 *${title}*`, 'video');
                } else {
                    await api.reply("❌ No pude obtener el enlace directo del video. Tal vez es privado o la API está saturada.");
                }
            } else {
                await api.reply("❌ Hubo un problema al procesar el enlace con el servidor de descargas.");
            }
        } catch (error) {
            console.error("Error en TikTok DL:", error.message);
            // Intentar con una API alternativa si la primera falla (Delirius)
            try {
                const altApi = global.APIs?.Delirius || "https://delirius-apiofc.vercel.app";
                const altRes = await axios.get(`${altApi}/download/tiktok?url=${encodeURIComponent(url)}`);
                
                if (altRes.data && altRes.data.data && altRes.data.data.no_wm) {
                    await api.sendMedia(altRes.data.data.no_wm, `🎵 *TikTok Descargado*`, 'video');
                } else {
                    await api.reply("❌ Ocurrió un error al intentar descargar el video. Intenta más tarde.");
                }
            } catch (altError) {
                await api.reply("❌ Servidores de descarga no disponibles en este momento.");
            }
        }
    }
};
