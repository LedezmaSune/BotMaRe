const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showBanner() {
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', '=======================================================');
    console.log('\x1b[35m%s\x1b[0m', '      🦊 BOTMARE AI - MENÚ DE CONTROL MAESTRO');
    console.log('\x1b[36m%s\x1b[0m', '=======================================================');
    console.log(` Sistema Operativo Detectado: \x1b[33m${process.platform.toUpperCase()}\x1b[0m`);
    console.log(` Directorio Base: \x1b[33m${path.resolve(__dirname, '..')}\x1b[0m`);
    console.log('\x1b[36m%s\x1b[0m', '=======================================================');
}

function showMenu() {
    showBanner();
    console.log(' \x1b[32m1.\x1b[0m 🚀 Iniciar Bot (Modo Producción - Recomendado)');
    console.log(' \x1b[32m2.\x1b[0m ⚡ Iniciar Bot + UI (Modo Desarrollo/Recarga Activa)');
    console.log(' \x1b[32m3.\x1b[0m 📦 Compilar Frontend (Build - Obligatorio para VPS/Termux)');
    console.log(' \x1b[32m4.\x1b[0m 🧹 Limpiar Cachés y Carpetas Temporales (Clean)');
    console.log(' \x1b[32m5.\x1b[0m 💾 Optimizar Espacio en Disco y Vaciar Logs (Vacuum)');
    console.log(' \x1b[32m6.\x1b[0m 🔑 Cerrar Sesión de WhatsApp (Forzar nuevo QR)');
    console.log(' \x1b[32m7.\x1b[0m 📥 Instalar/Actualizar Dependencias (pnpm install)');
    console.log(' \x1b[31m8.\x1b[0m ❌ Salir');
    console.log('\x1b[36m%s\x1b[0m', '=======================================================');
    
    rl.question('Selecciona una opción [1-8]: ', (choice) => {
        handleChoice(choice.trim());
    });
}

function runCmd(command, args, callback) {
    console.log('\x1b[36m%s\x1b[0m', `\n[Ejecutando] ${command} ${args.join(' ')}...\n`);
    
    // Usar shell para compatibilidad multiplataforma absoluta (Windows cmd, Linux/macOS/Android bash/sh)
    const proc = spawn(command, args, { 
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(__dirname, '..')
    });
    
    proc.on('close', (code) => {
        console.log('\x1b[36m%s\x1b[0m', `\n-------------------------------------------------------`);
        console.log(`[Terminado] Proceso finalizado con código: ${code}`);
        console.log('\x1b[36m%s\x1b[0m', `-------------------------------------------------------`);
        
        rl.question('\nPresiona ENTER para volver al menú principal...', () => {
            callback();
        });
    });
}

function handleChoice(choice) {
    switch (choice) {
        case '1':
            // start
            runCmd('pnpm', ['run', 'start'], showMenu);
            break;
        case '2':
            // dev
            runCmd('pnpm', ['run', 'dev'], showMenu);
            break;
        case '3':
            // build
            runCmd('pnpm', ['run', 'build'], showMenu);
            break;
        case '4':
            // clean
            runCmd('pnpm', ['run', 'clean'], showMenu);
            break;
        case '5':
            // clean:logs
            runCmd('node', ['bin/clean-logs.js'], showMenu);
            break;
        case '6':
            // reset:wa
            rl.question('\x1b[31m¿Estás seguro de que quieres cerrar la sesión de WhatsApp y eliminar las credenciales? (s/n): \x1b[0m', (ans) => {
                if (ans.toLowerCase() === 's' || ans.toLowerCase() === 'si' || ans.toLowerCase() === 'y') {
                    runCmd('pnpm', ['run', 'reset:wa'], showMenu);
                } else {
                    showMenu();
                }
            });
            break;
        case '7':
            // pnpm install
            runCmd('pnpm', ['install'], showMenu);
            break;
        case '8':
            console.log('\x1b[35m%s\x1b[0m', '\n🦊 ¡Gracias por usar BotMaRe AI! Saliendo...\n');
            rl.close();
            process.exit(0);
            break;
        default:
            console.log('\x1b[31mOpción inválida. Selecciona un número del 1 al 8.\x1b[0m');
            setTimeout(showMenu, 1500);
            break;
    }
}

// Iniciar el lanzador interactivo
showMenu();
