#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 *  🦊 BotMaRe AI - Asistente Interactivo de Proveedor de Secretos
 *  Soporte para 1Password Secrets Manager, dotenv y environment
 *  Cero Dependencias Externas (Módulos nativos de Node.js)
 * ═══════════════════════════════════════════════════════════════════
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const OP_TEMPLATE_PATH = path.join(ROOT_DIR, '.env.op');

const c = {
    reset: "\x1b[0m", dim: "\x1b[2m", bright: "\x1b[1m",
    cyan: "\x1b[36m", magenta: "\x1b[35m", green: "\x1b[32m",
    yellow: "\x1b[33m", red: "\x1b[31m", blue: "\x1b[34m",
    bgCyan: "\x1b[46m", bgMagenta: "\x1b[45m", bgBlue: "\x1b[44m"
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));

function detectOS() {
    if (fs.existsSync('/data/data/com.termux')) {
        return { type: 'termux', name: 'Android (Termux)', supported1P: false };
    }
    const platform = os.platform();
    if (platform === 'darwin') return { type: 'macos', name: 'macOS', supported1P: true };
    if (platform === 'win32') return { type: 'windows', name: 'Windows', supported1P: true };
    if (platform === 'linux') {
        let distro = 'Linux';
        try {
            const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
            const match = osRelease.match(/PRETTY_NAME="([^"]+)"/);
            if (match && match[1]) distro = match[1];
        } catch {}
        return { type: 'linux', name: distro, supported1P: true };
    }
    return { type: platform, name: platform, supported1P: false };
}

function isOpCliAvailable() {
    try {
        const out = execSync('op --version', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().trim();
        return { available: true, version: out };
    } catch {
        return { available: false, version: null };
    }
}

function showInstallInstructions(osInfo) {
    console.log(`\n${c.yellow}📖 Instrucciones Oficiales de Instalación de 1Password CLI:${c.reset}`);
    
    if (osInfo.type === 'linux') {
        console.log(`\n  ${c.cyan}# Para Debian / Ubuntu (x86_64 / arm64):${c.reset}`);
        console.log(`  curl -sS https://downloads.1password.com/linux/keys/1password.asc | sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg`);
        console.log(`  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$(dpkg --print-architecture) stable main" | sudo tee /etc/apt/sources.list.d/1password.list`);
        console.log(`  sudo apt update && sudo apt install 1password-cli -y\n`);
    } else if (osInfo.type === 'macos') {
        console.log(`\n  ${c.cyan}# Vía Homebrew:${c.reset}`);
        console.log(`  brew install --cask 1password-cli\n`);
    } else if (osInfo.type === 'windows') {
        console.log(`\n  ${c.cyan}# Vía Windows Package Manager (winget):${c.reset}`);
        console.log(`  winget install AgileBits.1Password.CLI\n`);
    } else if (osInfo.type === 'termux') {
        console.log(`\n  ${c.red}⚠️ 1Password CLI no cuenta con binarios oficiales para Android/Termux.${c.reset}`);
        console.log(`  ${c.yellow}👉 Recomendación: Utiliza el proveedor tradicional 'dotenv' (.env) en este dispositivo.${c.reset}\n`);
    }
    console.log(`  ${c.dim}Documentación oficial: https://developer.1password.com/docs/cli/get-started/${c.reset}\n`);
}

function getCurrentProvider() {
    if (process.env.BOTMARE_SECRET_PROVIDER) {
        return process.env.BOTMARE_SECRET_PROVIDER.toLowerCase();
    }
    if (fs.existsSync(ENV_PATH)) {
        try {
            const content = fs.readFileSync(ENV_PATH, 'utf8');
            const match = content.match(/^BOTMARE_SECRET_PROVIDER=(.*)$/m);
            if (match && match[1]) return match[1].trim().toLowerCase();
        } catch {}
    }
    return 'dotenv';
}

function setProviderInEnvFile(provider) {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const keyRegex = /^BOTMARE_SECRET_PROVIDER=.*$/m;
    if (keyRegex.test(content)) {
        content = content.replace(keyRegex, `BOTMARE_SECRET_PROVIDER=${provider}`);
    } else {
        content = `BOTMARE_SECRET_PROVIDER=${provider}\n` + content;
    }
    fs.writeFileSync(ENV_PATH, content, 'utf8');
}

async function configure1Password(osInfo) {
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bright}  Configuración de 1Password Secrets Manager${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════════${c.reset}\n`);

    const opCheck = isOpCliAvailable();
    if (!opCheck.available) {
        console.log(`  ${c.red}✖ 1Password CLI ('op') no está instalado o no se encuentra en el PATH.${c.reset}`);
        showInstallInstructions(osInfo);
        const ans = await ask(`  ¿Deseas verificar de nuevo si ya lo instalaste? (s/n): `);
        if (ans.toLowerCase() !== 's') return;
        return configure1Password(osInfo);
    }

    console.log(`  ${c.green}✔ 1Password CLI detectado:${c.reset} v${opCheck.version}`);

    // Comprobar autenticación (Service Account o cuenta interactiva)
    console.log(`\n  ${c.cyan}Comprobando acceso a 1Password...${c.reset}`);
    let authType = 'none';
    let serviceAccountPresent = !!process.env.OP_SERVICE_ACCOUNT_TOKEN;

    if (serviceAccountPresent) {
        console.log(`  ${c.green}✔ Variable OP_SERVICE_ACCOUNT_TOKEN detectada en el entorno actual.${c.reset}`);
        authType = 'service_account';
    } else {
        try {
            execSync('op whoami', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 });
            authType = 'user_account';
            console.log(`  ${c.green}✔ Sesión de usuario activa detectada vía 1Password CLI.${c.reset}`);
        } catch {
            console.log(`  ${c.yellow}⚠️ No se detectó OP_SERVICE_ACCOUNT_TOKEN ni una sesión activa de 'op'.${c.reset}`);
            console.log(`\n  ${c.dim}Para producción en Debian / Servidor sin interfaz gráfica:${c.reset}`);
            console.log(`  Genera un Service Account Token en 1Password (Integraciones -> Service Accounts).`);
            console.log(`  Exporta la variable: ${c.cyan}export OP_SERVICE_ACCOUNT_TOKEN="ops_..."${c.reset}\n`);
        }
    }

    // Solicitar nombre de la bóveda
    const vaultName = (await ask(`  Ingresa el nombre de tu bóveda de 1Password [ej. BotMaRe-Prod]: `)) || 'BotMaRe-Prod';
    
    // Generar o actualizar .env.op
    console.log(`\n  Generando plantilla de referencias seguras en ${c.cyan}.env.op${c.reset}...`);
    const opTemplate = [
        `# 🦊 BotMaRe AI - 1Password Secrets References Template`,
        `# Modifica los nombres de ítems y campos según tu estructura en 1Password.`,
        `# Bóveda: ${vaultName}`,
        ``,
        `# ── AUTENTICACIÓN Y SEGURIDAD ──`,
        `DASHBOARD_USER=admin`,
        `DASHBOARD_PASS=op://${vaultName}/botmare-dashboard/password`,
        `SUPERADMIN_KEY=op://${vaultName}/botmare-security/superadmin_key`,
        `WEBHOOK_API_KEY=op://${vaultName}/botmare-security/webhook_key`,
        `BACKUP_ENCRYPTION_KEY=op://${vaultName}/botmare-security/backup_key`,
        ``,
        `# ── PROVEEDORES DE IA (Descomenta o ajusta las que utilices) ──`,
        `GROQ_API_KEY=op://${vaultName}/botmare-ai/groq_api_key`,
        `GEMINI_API_KEY=op://${vaultName}/botmare-ai/gemini_api_key`,
        `OPENAI_API_KEY=op://${vaultName}/botmare-ai/openai_api_key`,
        `DEEPSEEK_API_KEY=op://${vaultName}/botmare-ai/deepseek_api_key`,
        ``,
        `# ── TELEGRAM & COMUNICACIONES ──`,
        `TELEGRAM_BOT_TOKEN=op://${vaultName}/botmare-telegram/token`,
        `GITHUB_WEBHOOK_SECRET=op://${vaultName}/botmare-github/webhook_secret`,
        `GITHUB_TOKEN=op://${vaultName}/botmare-github/token`
    ].join('\n') + '\n';

    fs.writeFileSync(OP_TEMPLATE_PATH, opTemplate, 'utf8');
    console.log(`  ${c.green}✔ Archivo .env.op generado exitosamente.${c.reset}`);

    // Validar resolución con 'op inject'
    console.log(`\n  ${c.cyan}Validando resolución de referencias con 1Password (modo seguro sin mostrar secretos)...${c.reset}`);
    try {
        const dryRun = execSync(`op inject -i "${OP_TEMPLATE_PATH}"`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 8000
        });

        // Contar referencias resueltas
        const lines = dryRun.split('\n');
        let resolved = 0;
        let unresolved = 0;
        for (const line of lines) {
            if (line.includes('=')) {
                const val = line.split('=')[1] || '';
                if (val.trim().startsWith('op://')) unresolved++;
                else if (val.trim()) resolved++;
            }
        }

        if (unresolved === 0 && resolved > 0) {
            console.log(`  ${c.green}✔ ¡Todas las referencias se resolvieron exitosamente en memoria (${resolved} variables)!${c.reset}`);
        } else {
            console.log(`  ${c.yellow}⚠️ Se resolvieron ${resolved} variables, pero ${unresolved} aún tienen formato op:// (verifica que existan en la bóveda).${c.reset}`);
        }
    } catch (testErr) {
        console.log(`  ${c.yellow}⚠️ La prueba de inyección en vivo no se completó:${c.reset}`);
        const cleanMsg = (testErr.stderr || testErr.message || '').replace(/ops_[^\s]+/g, '[TOKEN]');
        console.log(`     ${c.dim}${cleanMsg.trim()}${c.reset}`);
        console.log(`  ${c.cyan}💡 Puedes configurar el token de servicio o editar .env.op antes de activar el servicio.${c.reset}`);
    }

    // Activar 1Password como proveedor
    const confirm = await ask(`\n  ¿Deseas activar '1password' como proveedor principal de BotMaRe? (s/n): `);
    if (confirm.toLowerCase() === 's') {
        setProviderInEnvFile('1password');
        console.log(`\n  ${c.green}✔ Proveedor '1password' activado en .env (BOTMARE_SECRET_PROVIDER=1password).${c.reset}`);
        console.log(`  ${c.bright}👉 En producción con PM2 en Debian, inicia BotMaRe mediante:${c.reset}`);
        console.log(`     ${c.cyan}pnpm run pm2:start${c.reset}\n`);
    } else {
        console.log(`  Operación cancelada. El proveedor actual se mantiene.`);
    }
}

async function configureDotenv() {
    console.log(`\n${c.cyan}Cambiando proveedor a 'dotenv' (archivo local .env tradicional)...${c.reset}`);
    setProviderInEnvFile('dotenv');
    console.log(`${c.green}✔ Proveedor configurado como 'dotenv'.${c.reset}`);
    console.log(`BotMaRe cargará sus secretos exclusivamente desde el archivo .env local.\n`);
}

async function configureEnvironment() {
    console.log(`\n${c.cyan}Cambiando proveedor a 'environment' (variables inyectadas en SO / Docker)...${c.reset}`);
    setProviderInEnvFile('environment');
    console.log(`${c.green}✔ Proveedor configurado como 'environment'.${c.reset}`);
    console.log(`BotMaRe no requerirá un archivo .env físico si las variables ya están en el entorno.\n`);
}


const SENSITIVE_KEYWORDS = ['KEY', 'SECRET', 'PASS', 'TOKEN', 'PASSWORD', 'CREDENTIAL', 'AUTH', 'PWD', 'PRIVATE'];
const ITEM_MAPPINGS = {
    DASHBOARD_PASS: { item: 'botmare-dashboard', field: 'password' },
    SUPERADMIN_KEY: { item: 'botmare-security', field: 'superadmin_key' },
    WEBHOOK_API_KEY: { item: 'botmare-security', field: 'webhook_key' },
    BACKUP_ENCRYPTION_KEY: { item: 'botmare-security', field: 'backup_key' },
    JWT_SECRET: { item: 'botmare-security', field: 'jwt_secret' },
    SESSION_SECRET: { item: 'botmare-security', field: 'session_secret' },
    GROQ_API_KEY: { item: 'botmare-ai', field: 'groq_api_key' },
    GEMINI_API_KEY: { item: 'botmare-ai', field: 'gemini_api_key' },
    OPENAI_API_KEY: { item: 'botmare-ai', field: 'openai_api_key' },
    DEEPSEEK_API_KEY: { item: 'botmare-ai', field: 'deepseek_api_key' },
    CEREBRAS_API_KEY: { item: 'botmare-ai', field: 'cerebras_api_key' },
    SAMBANOVA_API_KEY: { item: 'botmare-ai', field: 'sambanova_api_key' },
    SILICONFLOW_API_KEY: { item: 'botmare-ai', field: 'siliconflow_api_key' },
    MISTRAL_API_KEY: { item: 'botmare-ai', field: 'mistral_api_key' },
    TOGETHER_API_KEY: { item: 'botmare-ai', field: 'together_api_key' },
    OPENROUTER_API_KEY: { item: 'botmare-ai', field: 'openrouter_api_key' },
    NVIDIA_API_KEY: { item: 'botmare-ai', field: 'nvidia_api_key' },
    CHEAPERINFERENCE_API_KEY: { item: 'botmare-ai', field: 'cheaperinference_api_key' },
    TELEGRAM_BOT_TOKEN: { item: 'botmare-telegram', field: 'token' },
    TELEGRAM_ALLOWED_USER_IDS: { item: 'botmare-telegram', field: 'allowed_user_ids' },
    TELEGRAM_ADMIN_CHAT_ID: { item: 'botmare-telegram', field: 'admin_chat_id' },
    GITHUB_TOKEN: { item: 'botmare-github', field: 'token' },
    GITHUB_WEBHOOK_SECRET: { item: 'botmare-github', field: 'webhook_secret' },
    HTTPSMS_API_KEY: { item: 'botmare-sms', field: 'api_key' },
    GOOGLE_SHEETS_SPREADSHEET_ID: { item: 'botmare-sheets', field: 'spreadsheet_id' },
    GOOGLE_SHEETS_API_KEY: { item: 'botmare-sheets', field: 'api_key' },
    DATABASE_URL: { item: 'botmare-database', field: 'database_url' },
    MONGODB_URI: { item: 'botmare-database', field: 'mongodb_uri' }
};

function isSensitive(key) {
    if (ITEM_MAPPINGS[key]) return true;
    const upper = key.toUpperCase();
    return SENSITIVE_KEYWORDS.some(kw => upper.includes(kw));
}

function getMapping(key) {
    if (ITEM_MAPPINGS[key]) return ITEM_MAPPINGS[key];
    return { item: 'botmare-config', field: key.toLowerCase() };
}

async function migrateEnvTo1PasswordCli() {
    console.log(`\n${c.magenta}═══════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bright}  🔄 Migración de Variables .env hacia 1Password${c.reset}`);
    console.log(`${c.magenta}═══════════════════════════════════════════════════════${c.reset}\n`);

    if (!fs.existsSync(ENV_PATH)) {
        console.log(`  ${c.red}✖ No se encontró el archivo .env en: ${ENV_PATH}${c.reset}\n`);
        return;
    }

    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const lines = envContent.split(/\r?\n/);
    let parsedCount = 0;
    const itemsData = {};
    const opLines = [
        '# 🦊 BotMaRe AI - 1Password Secrets References (Migrado desde .env)',
        '# Plantilla de referencias seguras generada automáticamente',
        `# Fecha: ${new Date().toISOString()}`,
        ''
    ];

    const vaultName = (await ask(`  Ingresa el nombre de tu bóveda en 1Password [ej. BotMaRe-Prod]: `)) || 'BotMaRe-Prod';
    opLines.push(`# Bóveda: ${vaultName}`, '');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            opLines.push(line);
            continue;
        }
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) {
            opLines.push(line);
            continue;
        }
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }

        if (key === 'BOTMARE_SECRET_PROVIDER') continue;

        if (val.startsWith('op://')) {
            opLines.push(`${key}=${val}`);
            parsedCount++;
            continue;
        }

        if (isSensitive(key) && val) {
            const { item, field } = getMapping(key);
            opLines.push(`${key}=op://${vaultName}/${item}/${field}`);
            if (!itemsData[item]) itemsData[item] = {};
            itemsData[item][field] = val;
            parsedCount++;
        } else {
            opLines.push(`${key}=${val}`);
        }
    }

    // 1. Respaldo de seguridad
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(ROOT_DIR, `.env.backup.${timestamp}`);
    fs.writeFileSync(backupPath, envContent, 'utf8');
    console.log(`  ${c.green}✔ Respaldo de seguridad creado:${c.reset} ${path.basename(backupPath)}`);

    // 2. Guardar .env.op
    fs.writeFileSync(OP_TEMPLATE_PATH, opLines.join('\n') + '\n', 'utf8');
    console.log(`  ${c.green}✔ Plantilla .env.op generada:${c.reset} ${parsedCount} variables sensibles mapeadas a op://`);

    // 3. Crear ítems en 1Password si se desea y op CLI está disponible
    const opCheck = isOpCliAvailable();
    if (opCheck.available) {
        const askUpload = await ask(`\n  ¿Deseas que la CLI 'op' cree/actualice automáticamente estos ítems en tu bóveda '${vaultName}'? (s/n): `);
        if (askUpload.toLowerCase() === 's') {
            console.log(`  ${c.cyan}Creando ítems en 1Password (modo seguro)... ${c.reset}`);
            for (const [itemTitle, fields] of Object.entries(itemsData)) {
                try {
                    const args = Object.entries(fields).map(([k, v]) => `"${k}=${v.replace(/"/g, '\\"')}"`).join(' ');
                    execSync(`op item create --category="Secure Note" --title="${itemTitle}" --vault="${vaultName}" ${args}`, {
                        stdio: ['ignore', 'pipe', 'pipe'],
                        timeout: 10000
                    });
                    console.log(`  ${c.green}✔ Ítem '${itemTitle}' creado en 1Password.${c.reset}`);
                } catch {
                    try {
                        const args = Object.entries(fields).map(([k, v]) => `"${k}=${v.replace(/"/g, '\\"')}"`).join(' ');
                        execSync(`op item edit "${itemTitle}" --vault="${vaultName}" ${args}`, {
                            stdio: ['ignore', 'pipe', 'pipe'],
                            timeout: 10000
                        });
                        console.log(`  ${c.green}✔ Ítem '${itemTitle}' actualizado en 1Password.${c.reset}`);
                    } catch (e) {
                        console.log(`  ${c.yellow}⚠️ No se pudo crear/editar '${itemTitle}' automáticamente (puedes crearlo manualmente).${c.reset}`);
                    }
                }
            }
        }
    }

    // 4. Activar 1Password como proveedor
    const askActivate = await ask(`\n  ¿Deseas activar '1password' como proveedor principal ahora? (s/n): `);
    if (askActivate.toLowerCase() === 's') {
        setProviderInEnvFile('1password');
        console.log(`\n  ${c.green}✔ Proveedor '1password' activado exitosamente en .env${c.reset}\n`);
    } else {
        console.log(`\n  ${c.cyan}✔ Migración lista. Tu proveedor actual se mantiene hasta que decidas cambiarlo.${c.reset}\n`);
    }
}

async function main() {
    console.clear();
    const osInfo = detectOS();
    const currentProvider = getCurrentProvider();

    console.log(`${c.magenta}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.magenta}║${c.reset}   ${c.bright}🦊 BOTMARE AI - ASISTENTE DE PROVEEDOR DE SECRETOS${c.reset}       ${c.magenta}║${c.reset}`);
    console.log(`${c.magenta}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
    console.log(`  ${c.dim}Sistema Operativo:${c.reset} ${c.yellow}${osInfo.name}${c.reset}`);
    console.log(`  ${c.dim}Proveedor Actual:${c.reset}  ${c.green}${currentProvider.toUpperCase()}${c.reset}\n`);

    console.log(`  ${c.cyan}[1]${c.reset} 📁 Archivo Local (.env tradicional con dotenv)`);
    console.log(`  ${c.cyan}[2]${c.reset} 🛡️ 1Password Secrets Manager (op CLI + .env.op)`);
    console.log(`  ${c.cyan}[3]${c.reset} 🔄 Migrar variables actuales de .env a 1Password`);
    console.log(`  ${c.cyan}[4]${c.reset} 💻 Variables del Entorno del Sistema (Docker / CI)`);
    console.log(`  ${c.cyan}[5]${c.reset} 🩺 Diagnóstico y Verificación de Salud`);
    console.log(`  ${c.red}[0] Volver / Salir${c.reset}\n`);

    const choice = await ask(`  Selecciona una opción [0-5]: `);

    switch (choice) {
        case '1':
            await configureDotenv();
            break;
        case '2':
            if (osInfo.type === 'termux') {
                console.log(`\n  ${c.red}⚠️ 1Password CLI no cuenta con binarios para Android/Termux.${c.reset}`);
                console.log(`  Se recomienda mantener 'dotenv' en este dispositivo.`);
                const force = await ask(`  ¿Deseas continuar de todas formas? (s/n): `);
                if (force.toLowerCase() !== 's') break;
            }
            await configure1Password(osInfo);
            break;
        case '3':
            await migrateEnvTo1PasswordCli();
            break;
        case '4':
            await configureEnvironment();
            break;
        case '5':
            console.log(`\n  ${c.cyan}Ejecutando diagnóstico de secretos...${c.reset}`);
            try {
                const { SecretProviderManager } = require('../src/core/secrets/provider');
                const health = SecretProviderManager.getInstance().checkHealth();
                console.log(`\n  ${c.bright}Reporte de Salud:${c.reset}`);
                console.log(`  • Estado:    ${health.status === 'ok' ? c.green : c.yellow}${health.status.toUpperCase()}${c.reset}`);
                console.log(`  • Proveedor: ${health.provider}`);
                console.log(`  • Origen:    ${health.details.source}`);
                console.log(`  • Claves:    ${health.details.resolvedCount}/5 resueltas`);
                if (health.details.error) console.log(`  • Aviso:     ${c.red}${health.details.error}${c.reset}`);
                console.log('');
            } catch (diagErr) {
                console.log(`  ${c.red}Error en diagnóstico: ${diagErr.message}${c.reset}\n`);
            }
            break;
        case '0':
            console.log(`\n  Hasta pronto.\n`);
            rl.close();
            process.exit(0);
        default:
            console.log(`\n  Opción no válida.\n`);
            break;
    }

    rl.close();
}

main().catch(err => {
    console.error(`\n❌ Error en el asistente de secretos:`, err.message);
    rl.close();
    process.exit(1);
});

