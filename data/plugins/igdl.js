module.exports = {
    name: "Instagram Downloader",
    description: "Descarga fotos y videos de Instagram (Reels y Posts). Uso: !ig [link]",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        
        // Detectar prefijo, comando y la URL ingresada
        const commandMatch = text.match(/^([!./#])?(ig|igdl|instagram|reel|igreel)\s*(.*)$/i);
        if (!commandMatch) return;

        const usedPrefix = commandMatch[1] || "!";
        const command = commandMatch[2];
        const url = commandMatch[3].trim();

        if (!url || !url.includes("instagram.com")) {
            await api.reply(`> ⓘ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙞𝙣𝙨𝙩𝙖𝙜𝙧𝙖𝙢 𝙫𝙖́𝙡𝙞𝙙𝙤, 𝙥𝙤𝙧 𝙚𝙟𝙚𝙢𝙥𝙡𝙤:\n> *${usedPrefix + command}* https://www.instagram.com/p/C_1234567/`);
            return;
        }

        try {
            await api.reply("⏳ Procesando descarga de Instagram...");

            // 1. Obtener sesión/cookie de instasupersave si es posible
            let session = "";
            try {
                const initRes = await axios.get('https://instasupersave.com/pt/', {
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52'
                    }
                });
                
                const cookies = initRes.headers['set-cookie'];
                if (cookies && Array.isArray(cookies)) {
                    const xsrfCookie = cookies.find(c => c.includes('XSRF-TOKEN'));
                    if (xsrfCookie) {
                        session = xsrfCookie.split(';')[0].replace('XSRF-TOKEN=', '').replace('%3D', '');
                    }
                }
            } catch (e) {
                // Continuar si falla la solicitud inicial
            }

            // Token fallback en caso de no obtener cookie
            if (!session) {
                session = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + Math.random().toString(36).substring(2);
            }

            // 2. Solicitud a la API de instasupersave
            const options = {
                method: 'POST',
                url: 'https://instasupersave.com/api/convert',
                headers: {
                    'origin': 'https://instasupersave.com',
                    'referer': 'https://instasupersave.com/pt/',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
                    'x-xsrf-token': session,
                    'Content-Type': 'application/json',
                    'Cookie': `XSRF-TOKEN=${session}; instasupersave_session=${session}`
                },
                data: { url: url }
            };

            const response = await axios(options);

            // 3. Extraer lista de URLs según la estructura exacta de la API
            const ig = [];
            if (Array.isArray(response.data)) {
                response.data.forEach((post) => {
                    const mediaUrl = post.sd === undefined ? post.thumb : (post.sd && post.sd.url ? post.sd.url : post.sd);
                    if (mediaUrl) ig.push(mediaUrl);
                });
            } else if (response.data && response.data.url && Array.isArray(response.data.url) && response.data.url.length > 0) {
                const first = response.data.url[0];
                ig.push(typeof first === 'object' ? first.url : first);
            } else if (response.data && typeof response.data.url === 'string') {
                ig.push(response.data.url);
            }

            if (ig.length === 0) {
                await api.reply("❌ No se pudo encontrar multimedia en el enlace proporcionado o la publicación es privada.");
                return;
            }

            // 4. Enviar cada elemento multimedia por WhatsApp
            let enviadoCount = 0;
            for (const mediaUrl of ig) {
                if (!mediaUrl) continue;

                const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || mediaUrl.includes('.m3u8');
                const mediaType = isVideo ? 'video' : 'image';

                await api.sendMedia(mediaUrl, `✅ *Instagram Downloader*`, mediaType);
                enviadoCount++;
            }

            if (enviadoCount === 0) {
                await api.reply("❌ No se pudieron extraer URLs válidas de descarga.");
            }

        } catch (error) {
            console.error("Error en InstagramDL Plugin:", error.message || error);
            await api.reply("❌ Hubo un error al procesar el enlace de Instagram. Intenta nuevamente más tarde.");
        }
    }
};
