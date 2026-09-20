module.exports = {
    name: "Facebook Downloader",
    description: "Descarga videos de Facebook (Reels, Shorts y Videos). Uso: !fb [link]",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        
        // Detectar prefijo, comando y la URL ingresada
        const commandMatch = text.match(/^([!./#])?(fb|fbdl|facebook|fbreel)\s*(.*)$/i);
        if (!commandMatch) return;

        const usedPrefix = commandMatch[1] || "!";
        const command = commandMatch[2];
        const url = commandMatch[3].trim();

        if (!url || (!url.includes("facebook.com") && !url.includes("fb.watch"))) {
            await api.reply(`> ⓘ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙛𝙖𝙘𝙚𝙗𝙤𝙤𝙠 𝙫𝙖́𝙡𝙞𝙙𝙤, 𝙥𝙤𝙧 𝙚𝙟𝙚𝙢𝙥𝙡𝙤:\n> *${usedPrefix + command}* https://fb.watch/fOTpgn6UFQ/`);
            return;
        }

        try {
            await api.reply(`> ⬇️ 𝘿𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙣𝙙𝙤 𝙫𝙞𝙙𝙚𝙤 𝙙𝙚 𝙛𝙖𝙘𝙚𝙗𝙤𝙤𝙠, 𝙚𝙨𝙥𝙚𝙧𝙚 𝙪𝙣𝙤𝙨 𝙢𝙞𝙣𝙪𝙩𝙤𝙨...`);

            let videoUrl = "";

            // 1. (REMOVIDO) api-dylux fue descontinuado y eliminado por vulnerabilidades críticas


            // 2. Fallback API Externa 1
            if (!videoUrl) {
                try {
                    const apiRes = await axios.get(`https://api.vyture.com/api/downloader/facebook?url=${encodeURIComponent(url)}`);
                    if (apiRes.data && apiRes.data.result) {
                        videoUrl = apiRes.data.result.hd || apiRes.data.result.sd || apiRes.data.result.url;
                    }
                } catch (e) {}
            }

            // 3. Fallback API Externa 2 (LolHuman API)
            if (!videoUrl) {
                try {
                    const lolKey = (global && global.APIKeys && global.APIKeys['https://api.lolhuman.xyz']) || 'GataDios';
                    const apiHost = (global && global.APIs && global.APIs.lol) || 'https://api.lolhuman.xyz';
                    const lolRes = await axios.get(`${apiHost}/api/facebook?apikey=${lolKey}&url=${encodeURIComponent(url)}`);
                    if (lolRes.data && lolRes.data.result) {
                        let VIDEO = Array.isArray(lolRes.data.result) ? lolRes.data.result[0] : lolRes.data.result;
                        if (!VIDEO || VIDEO === '') VIDEO = Array.isArray(lolRes.data.result) ? lolRes.data.result[1] : null;
                        if (VIDEO) videoUrl = VIDEO;
                    }
                } catch (e) {}
            }

            // 4. Fallback API Externa 3 (Latam API Vercel)
            if (!videoUrl) {
                try {
                    const latamRes = await axios.get(`https://latam-api.vercel.app/api/facebookdl?apikey=nekosmic&q=${encodeURIComponent(url)}`);
                    if (latamRes.data) {
                        const lData = latamRes.data.result || latamRes.data;
                        videoUrl = lData.video || lData.hd || lData.sd || lData.url || (Array.isArray(lData) ? lData[0] : null);
                    }
                } catch (e) {}
            }

            // 5. Fallback API Externa 4
            if (!videoUrl) {
                try {
                    const apiRes2 = await axios.get(`https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(url)}`);
                    if (apiRes2.data && apiRes2.data.data) {
                        const d = apiRes2.data.data;
                        videoUrl = d.hd || d.sd || (Array.isArray(d) ? d[0] : d);
                    }
                } catch (e) {}
            }

            if (!videoUrl) {
                await api.reply("> ⓧ 𝙀𝙧𝙧𝙤𝙧 𝙖𝙡 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙚𝙡 𝙫𝙞𝙙𝙚𝙤, 𝙥𝙤𝙧 𝙛𝙖𝙫𝙤𝙧 𝙞𝙣𝙩𝙚𝙣𝙩𝙚 𝙙𝙚 𝙣𝙪𝙚𝙫𝙤.");
                return;
            }

            // Enviar el video descargado por WhatsApp con el mensaje personalizado
            await api.sendMedia(videoUrl, `> ⓘ 𝘼𝙦𝙪𝙞 𝙩𝙞𝙚𝙣𝙚𝙨 𝙩𝙪 𝙫𝙞𝙙𝙚𝙤 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙙𝙤 𝙙𝙚 𝙛𝙖𝙘𝙚𝙗𝙤𝙤𝙠.`, 'video');

        } catch (error) {
            console.error("Error en FacebookDL Plugin:", error.message || error);
            await api.reply("> ⓧ 𝙀𝙧𝙧𝙤𝙧 𝙖𝙡 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙚𝙡 𝙫𝙞𝙙𝙚𝙤, 𝙥𝙤𝙧 𝙛𝙖𝙫𝙤𝙧 𝙞𝙣𝙩𝙚𝙣𝙩𝙚 𝙙𝙚 𝙣𝙪𝙚𝙫𝙤.");
        }
    }
};
