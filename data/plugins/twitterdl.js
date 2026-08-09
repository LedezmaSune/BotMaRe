module.exports = {
    name: "Twitter Downloader",
    description: "Descarga videos y fotos de Twitter",
    active: true,
    onMessage: async (ctx, api) => {
        const text = ctx.text || "";
        
        // Expresión regular para detectar comandos como .tw, !twdl, !twitter, etc.
        const commandMatch = text.match(/^[!.](tw|xdl|dlx|twdl|twt|twitter)(dl)?\s+(.+)$/i);
        if (!commandMatch) return; // No es el comando

        const url = commandMatch[3].trim();
        if (!url.includes("twitter.com") && !url.includes("x.com")) {
            await api.reply("> ⓘ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙩𝙬𝙞𝙩𝙩𝙚𝙧 𝙫𝙖𝙡𝙞𝙙𝙤 𝙥𝙖𝙧𝙖 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧𝙡𝙤, 𝙥𝙤𝙧 𝙚𝙟𝙚𝙢𝙥𝙡𝙤: !tw https://twitter.com/auronplay/status/1586487664274206720");
            return;
        }

        try {
            await api.reply("⏳ Procesando descarga...");

            const getAuthorization = async () => {
                const { data } = await axios.get("https://pastebin.com/raw/SnCfd4ru");
                return data;
            };

            const _twitterapi = (id) => `https://info.tweeload.site/status/${id}.json`;

            const idMatch = url.match(/\/([\d]+)/);
            if (!idMatch) {
                await api.reply("❌ Hubo un error obteniendo el ID del tweet. Asegúrate de que el enlace sea correcto.");
                return;
            }

            const response = await axios.get(_twitterapi(idMatch[1]), {
                headers: {
                    Authorization: await getAuthorization(),
                    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
                },
            });

            if (response.data.code !== 200) {
                await api.reply("❌ Ocurrió un error al intentar descargar el archivo.");
                return;
            }

            const tweet = response.data.tweet;
            const caption = tweet.text ? tweet.text : '> ✅ 𝘼𝙦𝙪𝙞 𝙩𝙞𝙚𝙣𝙚𝙨 ✅';

            if (tweet.media && tweet.media.videos) {
                for (let v of tweet.media.videos) {
                    if (v.type === 'video' && v.video_urls.length > 0) {
                        // Encontrar la url con mejor resolución (simplificado, tomamos la primera)
                        const videoUrl = v.video_urls[0].url;
                        await api.sendMedia(videoUrl, caption, 'video');
                    }
                }
            } else if (tweet.media && tweet.media.photos) {
                for (let p of tweet.media.photos) {
                    await api.sendMedia(p.url, caption, 'image');
                }
            } else {
                await api.reply("❌ No se encontró multimedia en ese tweet.");
            }

        } catch (error) {
            console.error("Error en TwitterDL:", error);
            await api.reply('*[❗] Error, intente mas tarde.*');
        }
    }
};
