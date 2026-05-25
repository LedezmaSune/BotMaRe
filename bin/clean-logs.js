const fs = require('fs');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '🧹 [Mantenimiento] Iniciando limpieza de registros y optimización de base de datos...');

const logsDir = path.resolve(__dirname, '../data/logs');
const dbPath = path.resolve(__dirname, '../data/database.db');
const waDbPath = path.resolve(__dirname, '../data/whatsapp_auth.db');

// 1. Limpiar archivos de log
if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    let deletedCount = 0;
    files.forEach(file => {
        if (file.endsWith('.log')) {
            try {
                fs.unlinkSync(path.join(logsDir, file));
                deletedCount++;
            } catch (err) {
                // Si el archivo está siendo usado por PM2, vaciarlo en su lugar
                try {
                    fs.writeFileSync(path.join(logsDir, file), '');
                    deletedCount++;
                } catch (e) {
                    console.log(`  \x1b[33m[!] No se pudo vaciar/eliminar log: ${file} (En uso por el sistema)\x1b[0m`);
                }
            }
        }
    });
    console.log(`  \x1b[32m✓ Se limpiaron ${deletedCount} archivos de log en data/logs/\x1b[0m`);
}

// 2. Limpiar logs sueltos en raíz
const rootDir = path.resolve(__dirname, '..');
const rootFiles = fs.readdirSync(rootDir);
rootFiles.forEach(file => {
    if (file.endsWith('.log') && file !== 'npm-debug.log') {
        try {
            fs.unlinkSync(path.join(rootDir, file));
            console.log(`  \x1b[32m✓ Se eliminó log en raíz: ${file}\x1b[0m`);
        } catch (e) {}
    }
});

// 3. Optimizar bases de datos SQLite (VACUUM)
try {
    const Database = require('better-sqlite3');
    
    if (fs.existsSync(dbPath)) {
        const db = new Database(dbPath);
        db.exec('VACUUM;');
        db.close();
        console.log('  \x1b[32m✓ Base de datos principal optimizada con éxito (VACUUM).\x1b[0m');
    }
    
    if (fs.existsSync(waDbPath)) {
        const db = new Database(waDbPath);
        db.exec('VACUUM;');
        db.close();
        console.log('  \x1b[32m✓ Base de datos de WhatsApp optimizada con éxito (VACUUM).\x1b[0m');
    }
} catch (err) {
    console.log('  \x1b[33m[!] No se pudo ejecutar VACUUM en las bases de datos (SQLite en uso o better-sqlite3 no disponible).\x1b[0m');
}

console.log('\x1b[36m%s\x1b[0m', '✅ [Limpieza Completada] El sistema está ligero y optimizado.\n');
