#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.resolve(process.cwd(), '.env');
const examplePath = path.resolve(process.cwd(), '.env.example');

// Asegurar que existe el archivo .env
if (!fs.existsSync(envPath)) {
    if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, envPath);
        console.log('[setup:secrets] Archivo .env creado a partir de .env.example.');
    } else {
        fs.writeFileSync(envPath, '', 'utf8');
        console.log('[setup:secrets] Archivo .env nuevo creado.');
    }
}

let content = fs.readFileSync(envPath, 'utf8');

function generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64url');
}

function getEnvValue(text, key) {
    const match = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (!match) return '';
    let val = match[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim();
    }
    return val;
}

const definitions = [
    {
        key: 'DASHBOARD_USER',
        defaultVal: 'admin',
        isGenerator: false,
        isInsecure: (val) => !val || val.trim() === ''
    },
    {
        key: 'DASHBOARD_PASS',
        generator: () => generateToken(18),
        isGenerator: true,
        isInsecure: (val) => !val || val.trim() === '' || val.trim() === 'tu_contrasena_segura' || val.trim() === 'admin123' || val.includes('CAMBIA_ESTO')
    },
    {
        key: 'WEBHOOK_API_KEY',
        generator: () => generateToken(32),
        isGenerator: true,
        isInsecure: (val) => !val || val.trim() === '' || val.trim() === 'botmare_default_secret_key' || val.includes('CAMBIA_ESTO')
    },
    {
        key: 'SUPERADMIN_KEY',
        generator: () => generateToken(32),
        isGenerator: true,
        isInsecure: (val) => !val || val.trim() === '' || val.trim() === 'botmare_admin' || val.includes('CAMBIA_ESTO')
    },
    {
        key: 'BACKUP_ENCRYPTION_KEY',
        generator: () => generateToken(32),
        isGenerator: true,
        isInsecure: (val) => !val || val.trim() === '' || val.trim() === 'admin123' || val.includes('CAMBIA_ESTO')
    }
];

async function run() {
    let generatedCount = 0;
    let preservedCount = 0;
    const finalValues = {};

    console.log('\n🔐 [setup:secrets] Verificando y generando secretos criptográficos...\n');

    for (const def of definitions) {
        const keyRegex = new RegExp(`^${def.key}=(.*)$`, 'm');
        const match = content.match(keyRegex);

        if (match) {
            let rawVal = match[1].trim();
            if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
                rawVal = rawVal.slice(1, -1).trim();
            }

            if (def.isInsecure(rawVal)) {
                const newVal = def.isGenerator ? def.generator() : def.defaultVal;
                content = content.replace(keyRegex, `${def.key}=${newVal}`);
                console.log(`  ⚡ ${def.key}: Generado nuevo valor seguro`);
                finalValues[def.key] = newVal;
                generatedCount++;
            } else {
                console.log(`  ✓ ${def.key}: Conservado valor actual existente`);
                finalValues[def.key] = rawVal;
                preservedCount++;
            }
        } else {
            const newVal = def.isGenerator ? def.generator() : def.defaultVal;
            content += `\n${def.key}=${newVal}\n`;
            console.log(`  ➕ ${def.key}: Añadido con nuevo valor seguro`);
            finalValues[def.key] = newVal;
            generatedCount++;
        }
    }

    // Guardar cambios en el archivo .env físico
    fs.writeFileSync(envPath, content, 'utf8');

    console.log(`\n✅ Proceso completado: ${generatedCount} actualizados/generados, ${preservedCount} conservados.`);
    console.log('🔒 Tu archivo .env ha sido actualizado con claves criptográficamente seguras.\n');

    // 1. Mostrar credenciales en texto claro en la consola
    console.log('================================================================================');
    console.log('🔑 CREDENCIALES Y SECRETOS DEL SISTEMA (.env)');
    console.log('================================================================================');
    console.log(`  • DASHBOARD_USER:        ${finalValues.DASHBOARD_USER}`);
    console.log(`  • DASHBOARD_PASS:        ${finalValues.DASHBOARD_PASS}`);
    console.log(`  • SUPERADMIN_KEY:        ${finalValues.SUPERADMIN_KEY}`);
    console.log(`  • WEBHOOK_API_KEY:       ${finalValues.WEBHOOK_API_KEY}`);
    console.log(`  • BACKUP_ENCRYPTION_KEY: ${finalValues.BACKUP_ENCRYPTION_KEY}`);
    console.log('================================================================================');
    console.log('💡 Guarda estas credenciales en un lugar seguro (gestor de contraseñas).\n');

    // 2. Enviar por Telegram en archivo .txt si Telegram está configurado
    const telegramToken = getEnvValue(content, 'TELEGRAM_BOT_TOKEN');
    const allowedUserIds = getEnvValue(content, 'TELEGRAM_ALLOWED_USER_IDS');

    const isTelegramConfigured = telegramToken && 
        telegramToken.trim() !== '' && 
        !telegramToken.includes('CAMBIA_ESTO') && 
        allowedUserIds && 
        allowedUserIds.trim() !== '' && 
        !allowedUserIds.includes('CAMBIA_ESTO');

    if (isTelegramConfigured) {
        console.log('📡 [Telegram] Configuración detectada. Enviando respaldo de credenciales...');
        try {
            const { Bot, InputFile } = require('grammy');
            const telegramBot = new Bot(telegramToken);
            const userIds = allowedUserIds.split(',').map(id => id.trim()).filter(Boolean);

            const now = new Date().toLocaleString('es-MX', { timeZoneName: 'short' });
            const txtContent = [
                '# ========================================================',
                '# 🦊 BOTMARE - CREDENCIALES Y SECRETOS DEL SISTEMA',
                `# Fecha de generación: ${now}`,
                '# ========================================================',
                '',
                `DASHBOARD_USER=${finalValues.DASHBOARD_USER}`,
                `DASHBOARD_PASS=${finalValues.DASHBOARD_PASS}`,
                `SUPERADMIN_KEY=${finalValues.SUPERADMIN_KEY}`,
                `WEBHOOK_API_KEY=${finalValues.WEBHOOK_API_KEY}`,
                `BACKUP_ENCRYPTION_KEY=${finalValues.BACKUP_ENCRYPTION_KEY}`,
                '',
                '# ========================================================',
                '# ⚠️ IMPORTANTE: Mantén este archivo en un lugar seguro.',
                '# No compartas estas claves con personas no autorizadas.',
                '# ========================================================'
            ].join('\n');

            const caption = `🔐 *Secretos y Credenciales de BotMaRe*\n\n` +
                `📅 *Fecha:* ${now}\n\n` +
                `👤 *Usuario:* \`${finalValues.DASHBOARD_USER}\`\n` +
                `🔑 *Dashboard Pass:* \`${finalValues.DASHBOARD_PASS}\`\n` +
                `🛡️ *SuperAdmin Key:* \`${finalValues.SUPERADMIN_KEY}\`\n` +
                `⚡ *Webhook Key:* \`${finalValues.WEBHOOK_API_KEY}\`\n` +
                `📦 *Backup Key:* \`${finalValues.BACKUP_ENCRYPTION_KEY}\`\n\n` +
                `📁 _Adjunto archivo con el respaldo de tus credenciales._`;

            for (const userId of userIds) {
                try {
                    await telegramBot.api.sendDocument(
                        userId,
                        new InputFile(Buffer.from(txtContent, 'utf8'), `secretos_botmare_${Date.now()}.txt`),
                        {
                            caption,
                            parse_mode: 'Markdown'
                        }
                    );
                    console.log(`  📲 [Telegram] Credenciales y archivo .txt enviados con éxito al ID [${userId}]`);
                } catch (sendErr) {
                    console.warn(`  ⚠️ [Telegram] No se pudo enviar al ID [${userId}]: ${sendErr.message}`);
                }
            }
        } catch (e) {
            console.warn(`  ⚠️ [Telegram] Error al inicializar envío a Telegram: ${e.message}`);
        }
    } else {
        console.log('ℹ️  [Telegram] No configurado (TELEGRAM_BOT_TOKEN o TELEGRAM_ALLOWED_USER_IDS ausente).');
        console.log('    (Si configuras ambas variables en tu .env, las credenciales se enviarán automáticamente a tu Telegram).\n');
    }
}

run().catch(err => {
    console.error('❌ Error fatal en setup:secrets:', err);
    process.exit(1);
});
