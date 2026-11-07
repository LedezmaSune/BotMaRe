const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const outDir = path.resolve(__dirname, '../out');
const prebuiltTar = path.resolve(__dirname, 'dashboard-out.tar.gz');

// 1. Asegurar Dashboard visual (descomprimir precompilado de 544 KB o compilar)
const isMissingOrEmpty = !fs.existsSync(outDir) || fs.readdirSync(outDir).length === 0;

if (isMissingOrEmpty) {
    if (fs.existsSync(prebuiltTar)) {
        console.log('[BotMaRe] Descomprimiendo Dashboard visual precompilado (544 KB)...');
        fs.mkdirSync(outDir, { recursive: true });
        try {
            execSync(`tar -xzf "${prebuiltTar}" -C "${outDir}"`, { stdio: 'inherit' });
            console.log('[BotMaRe] ¡Dashboard listo instantáneamente sin consumo de CPU/RAM!');
        } catch (e) {
            console.warn('[BotMaRe] No se pudo descomprimir con tar. Compilando manualmente con Next.js...');
            try {
                execSync('pnpm run build', { stdio: 'inherit' });
            } catch (buildErr) {
                console.error('[BotMaRe] Error al compilar el proyecto.');
                process.exit(1);
            }
        }
    } else {
        console.log('[BotMaRe] La carpeta out/ no existe. Ejecutando "pnpm run build" automáticamente...');
        try {
            execSync('pnpm run build', { stdio: 'inherit' });
        } catch (e) {
            console.error('[BotMaRe] Error al compilar el proyecto.');
            process.exit(1);
        }
    }
}

// 2. En Termux: auto-compilar better-sqlite3 si aún no está compilado para Android ARM64
const isTermux = fs.existsSync('/data/data/com.termux');
if (isTermux) {
    try {
        require('better-sqlite3');
    } catch (sqliteErr) {
        console.log('[BotMaRe] Detectado better-sqlite3 sin compilar en Termux. Compilando automáticamente...');
        const termuxPrefix = '/data/data/com.termux/files/usr';
        const homeDir = process.env.HOME || '/data/data/com.termux/files/home';
        const gypDir = path.join(homeDir, '.gyp');
        if (!fs.existsSync(gypDir)) fs.mkdirSync(gypDir, { recursive: true });
        fs.writeFileSync(path.join(gypDir, 'include.gypi'), "{'variables':{'android_ndk_path':''}}\n");

        const env = {
            ...process.env,
            CC: 'clang',
            CXX: 'clang++',
            LINK: 'clang++',
            npm_config_build_from_source: 'true',
            npm_config_sqlite: termuxPrefix
        };

        try {
            execSync(`pnpm rebuild better-sqlite3 --build-from-source --sqlite="${termuxPrefix}"`, {
                stdio: 'inherit',
                env
            });
            console.log('[BotMaRe] ¡better-sqlite3 compilado exitosamente para Termux!');
        } catch (rebuildErr) {
            try {
                execSync(`npm rebuild better-sqlite3 --build-from-source --sqlite="${termuxPrefix}"`, {
                    stdio: 'inherit',
                    env
                });
                console.log('[BotMaRe] ¡better-sqlite3 compilado exitosamente para Termux (vía npm)!');
            } catch (npmErr) {
                console.warn('[BotMaRe] Advertencia al compilar better-sqlite3 (se activará fallback multi-archivo resiliente):', npmErr.message);
            }
        }
    }
}
