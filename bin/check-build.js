const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const outDir = path.resolve(__dirname, '../out');

if (!fs.existsSync(outDir)) {
    console.log('[BotMaRe] La carpeta out/ no existe. Ejecutando "pnpm run build" automáticamente...');
    try {
        execSync('pnpm run build', { stdio: 'inherit' });
    } catch (e) {
        console.error('[BotMaRe] Error al compilar el proyecto.');
        process.exit(1);
    }
}
