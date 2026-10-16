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

function maskSecret(val) {
    if (!val || typeof val !== 'string') return '';
    if (val.length <= 6) return '******';
    return `${val.substring(0, 4)}...${val.substring(val.length - 2)} (longitud: ${val.length})`;
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

let generatedCount = 0;
let preservedCount = 0;

console.log('\n🔐 [setup:secrets] Verificando secretos criptográficos en .env...\n');

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
            console.log(`  ⚡ ${def.key}: Generado nuevo valor seguro [${maskSecret(newVal)}]`);
            generatedCount++;
        } else {
            console.log(`  ✓ ${def.key}: Ya configurado [${maskSecret(rawVal)}]`);
            preservedCount++;
        }
    } else {
        const newVal = def.isGenerator ? def.generator() : def.defaultVal;
        content += `\n${def.key}=${newVal}\n`;
        console.log(`  ➕ ${def.key}: Añadido con valor seguro [${maskSecret(newVal)}]`);
        generatedCount++;
    }
}

fs.writeFileSync(envPath, content, 'utf8');

console.log(`\n✅ Proceso completado: ${generatedCount} actualizados/generados, ${preservedCount} conservados.`);
console.log('🔒 Tu archivo .env ahora contiene credenciales y claves criptográficamente seguras.\n');
