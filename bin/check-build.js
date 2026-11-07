const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const outDir = path.resolve(__dirname, '../out');
const prebuiltTar = path.resolve(__dirname, 'dashboard-out.tar.gz');

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
