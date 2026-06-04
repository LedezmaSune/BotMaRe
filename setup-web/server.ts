import express from 'express';
import fs from 'fs';
import path from 'path';
import { TunnelService } from '../src/core/tunnel';

export async function startSetupServer(): Promise<void> {
    return new Promise(async (resolve) => {
        const app = express();
        const PORT = process.env.PORT || 8000;

        // Generar PIN de seguridad de 6 dígitos
        const SECURITY_PIN = Math.floor(100000 + Math.random() * 900000).toString();

        app.use(express.json());

        // Servir el index.html
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // API para guardar los datos
        app.post('/api/setup', (req, res) => {
            try {
                const { username, password, aiProvider, apiKey, telegramToken, telegramUsers, rawEnvContent, securityPin } = req.body;
                
                // Validar PIN de seguridad
                if (securityPin !== SECURITY_PIN) {
                    return res.status(401).json({ error: 'PIN de seguridad incorrecto' });
                }

                const envPath = path.join(process.cwd(), '.env');

                if (rawEnvContent) {
                    fs.writeFileSync(envPath, rawEnvContent, 'utf8');
                    console.log(`\n✅ Archivo .env restaurado desde respaldo exitosamente.`);
                    res.json({ success: true });
                    setTimeout(() => {
                        console.log(`\n🛑 Servidor de configuración apagado. Por favor, reinicia el bot para cargar la nueva configuración.`);
                        TunnelService.getInstance().stop();
                        process.exit(0);
                    }, 1000);
                    return;
                }

                if (!username || !password || !aiProvider || !apiKey) {
                    return res.status(400).json({ error: 'Faltan campos obligatorios' });
                }

                const envExamplePath = path.join(process.cwd(), '.env.example');

                // Si no hay .env.example, creamos un archivo base
                let envContent = '';
                if (fs.existsSync(envExamplePath)) {
                    envContent = fs.readFileSync(envExamplePath, 'utf8');
                } else {
                    envContent = `PORT=8000\nDASHBOARD_USER=\nDASHBOARD_PASS=\nGROQ_API_KEY=\nGEMINI_API_KEY=\nOPENAI_API_KEY=\nDEEPSEEK_API_KEY=\n`;
                }

                // Reemplazamos los valores obligatorios
                envContent = envContent.replace(/^DASHBOARD_USER=.*$/m, `DASHBOARD_USER=${username}`);
                envContent = envContent.replace(/^DASHBOARD_PASS=.*$/m, `DASHBOARD_PASS=${password}`);

                // Valores de Telegram (Opcionales)
                if (telegramToken) {
                    if (new RegExp('^TELEGRAM_BOT_TOKEN=', 'm').test(envContent)) {
                        envContent = envContent.replace(/^TELEGRAM_BOT_TOKEN=.*$/m, `TELEGRAM_BOT_TOKEN=${telegramToken}`);
                    } else {
                        envContent += `\nTELEGRAM_BOT_TOKEN=${telegramToken}`;
                    }
                }
                
                if (telegramUsers) {
                    if (new RegExp('^TELEGRAM_ALLOWED_USER_IDS=', 'm').test(envContent)) {
                        envContent = envContent.replace(/^TELEGRAM_ALLOWED_USER_IDS=.*$/m, `TELEGRAM_ALLOWED_USER_IDS=${telegramUsers}`);
                    } else {
                        envContent += `\nTELEGRAM_ALLOWED_USER_IDS=${telegramUsers}`;
                    }
                }

                // Mapeo del proveedor
                const keyMap: Record<string, string> = {
                    'groq': 'GROQ_API_KEY',
                    'gemini': 'GEMINI_API_KEY',
                    'openai': 'OPENAI_API_KEY',
                    'deepseek': 'DEEPSEEK_API_KEY'
                };

                const envKey = keyMap[aiProvider];
                if (envKey) {
                    // Si ya existe la línea, la reemplazamos
                    if (new RegExp(`^${envKey}=`, 'm').test(envContent)) {
                        envContent = envContent.replace(new RegExp(`^${envKey}=.*$`, 'm'), `${envKey}=${apiKey}`);
                    } else {
                        // Si no existe, la añadimos al final
                        envContent += `\n${envKey}=${apiKey}`;
                    }
                }

                // Guardamos el nuevo .env
                fs.writeFileSync(envPath, envContent, 'utf8');
                console.log(`\n✅ Archivo .env generado exitosamente.`);

                res.json({ success: true });

                // Apagamos el servidor después de responder
                setTimeout(() => {
                    console.log(`\n🛑 Servidor de configuración apagado. Por favor, reinicia el bot para cargar la nueva configuración.`);
                    TunnelService.getInstance().stop();
                    process.exit(0);
                }, 1000);

            } catch (error) {
                console.error('Error al guardar el .env:', error);
                res.status(500).json({ error: 'Error interno al guardar la configuración' });
            }
        });

        app.listen(PORT, async () => {
            console.log(`\n======================================================`);
            console.log(`🦊 ASISTENTE DE CONFIGURACIÓN INICIAL ACTIVADO`);
            console.log(`======================================================`);
            console.log(`⚠️ No se detectó un archivo .env válido.`);
            console.log(`\nIniciando túnel seguro de Cloudflare...`);
            
            const tunnel = TunnelService.getInstance();
            let tunnelUrl = null;
            try {
                tunnelUrl = await tunnel.start(Number(PORT));
            } catch (e) {
                console.log(`No se pudo establecer el túnel. Modo local únicamente.`);
            }

            console.log(`\n👉 Para configurar el bot, ingresa a:`);
            console.log(`   🏠 LOCAL: http://localhost:${PORT}`);
            if (tunnelUrl) {
                console.log(`   🌍 WEB:   ${tunnelUrl}`);
            }
            console.log(`\n🔒 PIN DE SEGURIDAD: \x1b[33m\x1b[1m${SECURITY_PIN}\x1b[0m`);
            console.log(`   (Deberás ingresar este PIN en la página web)`);
            console.log(`======================================================\n`);
            resolve();
        });
    });
}
