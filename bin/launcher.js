const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const c = {
    reset: "\x1b[0m", dim: "\x1b[2m", bright: "\x1b[1m",
    cyan: "\x1b[36m", magenta: "\x1b[35m", green: "\x1b[32m",
    yellow: "\x1b[33m", red: "\x1b[31m", blue: "\x1b[34m"
};

function showBanner() {
    console.clear();
    console.log(c.cyan + `
    ██████╗  ██████╗ ████████╗███╗   ███╗███████╗██████╗ 
    ██╔══██╗██╔═══██╗╚══██╔══╝████╗ ████║██╔════╝██╔══██╗
    ██████╦╝██║   ██║   ██║   ██╔████╔██║█████╗  ██████╔╝
    ██╔══██╗██║   ██║   ██║   ██║╚██╔╝██║██╔══╝  ██╔══██╗
    ██████╦╝╚██████╔╝   ██║   ██║ ╚═╝ ██║███████╗██║  ██║
    ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
    ` + c.reset);
    console.log(c.magenta + "                  » Control Maestro «" + c.reset);
    console.log(c.dim + "===========================================================" + c.reset);
    console.log(` ${c.cyan}OS:${c.reset} \x1b[33m${process.platform.toUpperCase()}\x1b[0m  |  ${c.cyan}DIR:${c.reset} \x1b[33m${path.resolve(__dirname, '..')}\x1b[0m`);
    console.log(c.dim + "===========================================================\n" + c.reset);
}

function showMenu() {
    showBanner();
    console.log(`  ${c.green}[1]${c.reset} 🚀 Iniciar Servidor ${c.dim}(Modo Producción)${c.reset}`);
    console.log(`  ${c.green}[2]${c.reset} ⚡ Iniciar Desarrollo ${c.dim}(Live Reload + Turbopack)${c.reset}`);
    console.log(`  ${c.green}[3]${c.reset} 📦 Compilar Frontend ${c.dim}(Build Next.js)${c.reset}`);
    console.log(`  ${c.green}[4]${c.reset} 🧹 Limpiar Cachés y .next ${c.dim}(Clean)${c.reset}`);
    console.log(`  ${c.green}[5]${c.reset} 💾 Optimizar Disco y Logs ${c.dim}(Vacuum)${c.reset}`);
    console.log(`  ${c.green}[6]${c.reset} 🔑 Forzar Nuevo QR ${c.dim}(Cerrar Sesión WA)${c.reset}`);
    console.log(`  ${c.green}[7]${c.reset} 📥 Actualizar Dependencias ${c.dim}(pnpm install)${c.reset}`);
    console.log(`  ${c.cyan}[8]${c.reset} ⚙️ Gestión de PM2 ${c.dim}(Segundo Plano)${c.reset}`);
    console.log(`  ${c.blue}[9]${c.reset} 📁 Explorador de Carpetas ${c.dim}(Abrir localmente)${c.reset}`);
    console.log(`  ${c.red}[10]${c.reset} ❌ Salir del Sistema`);
    console.log(c.dim + "\n===========================================================" + c.reset);
    
    rl.question(`\n  ${c.cyan}➤ Selecciona una acción [1-10]:${c.reset} `, (choice) => {
        handleChoice(choice.trim());
    });
}

function showFoldersMenu() {
    console.clear();
    console.log(c.blue + `
    ███████╗██╗██╗     ███████╗███████╗
    ██╔════╝██║██║     ██╔════╝██╔════╝
    █████╗  ██║██║     █████╗  ███████╗
    ██╔══╝  ██║██║     ██╔══╝  ╚════██║
    ██║     ██║███████╗███████╗███████║
    ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝
    ` + c.reset);
    console.log(c.magenta + "              » Explorador de Carpetas «" + c.reset);
    console.log(c.dim + "===========================================================" + c.reset);
    console.log(`  ${c.blue}[1]${c.reset} 📁 Carpeta Raíz del Proyecto`);
    console.log(`  ${c.blue}[2]${c.reset} 📁 Carpeta de Base de Datos y Logs (data/)`);
    console.log(`  ${c.blue}[3]${c.reset} 📁 Carpeta de Backups (backups/)`);
    console.log(`  ${c.blue}[4]${c.reset} 📁 Sesión de WhatsApp (auth_info_baileys/)`);
    console.log(`  ${c.blue}[5]${c.reset} 📁 Archivos Multimedia Descargados (data/media)`);
    console.log(`  ${c.cyan}[0]${c.reset} ⬅ Volver al Menú Principal`);
    console.log(c.dim + "===========================================================" + c.reset);
    
    rl.question(`\n  ${c.cyan}➤ Selecciona la carpeta a abrir [0-5]:${c.reset} `, (choice) => {
        handleFoldersChoice(choice.trim());
    });
}

const { exec } = require('child_process');

function openFolder(folderName) {
    const p = path.resolve(__dirname, '..', folderName);
    console.log(`\n  ${c.green}📂 Abriendo: ${p}${c.reset}`);
    let cmd;
    switch (process.platform) {
        case 'darwin': cmd = `open "${p}"`; break;
        case 'win32': cmd = `start "" "${p}"`; break;
        default: cmd = `xdg-open "${p}"`; break;
    }
    exec(cmd, (err) => {
        if (err) {
            console.log(`  ${c.red}✖ El sistema no pudo abrir la ventana automáticamente.${c.reset}`);
        }
        setTimeout(showFoldersMenu, 1500);
    });
}

function handleFoldersChoice(choice) {
    switch (choice) {
        case '1': openFolder(''); break;
        case '2': openFolder('data'); break;
        case '3': openFolder('backups'); break;
        case '4': openFolder('auth_info_baileys'); break;
        case '5': openFolder('data/media'); break;
        case '0': showMenu(); break;
        default:
            console.log(`\n  ${c.red}✖ Opción inválida.${c.reset}`);
            setTimeout(showFoldersMenu, 1200);
            break;
    }
}

function showPM2Menu() {
    console.clear();
    console.log(c.cyan + `
    ██████╗ ███╗   ███╗██████╗ 
    ██╔══██╗████╗ ████║╚════██╗
    ██████╔╝██╔████╔██║ █████╔╝
    ██╔═══╝ ██║╚██╔╝██║██╔═══╝ 
    ██║     ██║ ╚═╝ ██║███████╗
    ╚═╝     ╚═╝     ╚═╝╚══════╝
    ` + c.reset);
    console.log(c.magenta + "                  » Gestión de PM2 «" + c.reset);
    console.log(c.dim + "===========================================================" + c.reset);
    console.log(`  ${c.green}[1]${c.reset} ▶ Iniciar en Segundo Plano ${c.dim}(pm2:start)${c.reset}`);
    console.log(`  ${c.yellow}[2]${c.reset} 🔄 Reiniciar Bot ${c.dim}(pm2:restart)${c.reset}`);
    console.log(`  ${c.red}[3]${c.reset} ⏹ Detener Bot ${c.dim}(pm2:stop)${c.reset}`);
    console.log(`  ${c.cyan}[4]${c.reset} 📋 Ver Logs en Vivo ${c.dim}(pm2:logs)${c.reset}`);
    console.log(`  ${c.cyan}[5]${c.reset} 📊 Monitor de Recursos ${c.dim}(pm2:monit)${c.reset}`);
    console.log(`  ${c.red}[6]${c.reset} 🗑 Eliminar Proceso de PM2 ${c.dim}(pm2:delete)${c.reset}`);
    console.log(`  ${c.blue}[0]${c.reset} ⬅ Volver al Menú Principal`);
    console.log(c.dim + "===========================================================" + c.reset);
    
    rl.question(`\n  ${c.cyan}➤ Selecciona una acción [0-6]:${c.reset} `, (choice) => {
        handlePM2Choice(choice.trim());
    });
}

function handlePM2Choice(choice) {
    switch (choice) {
        case '1': runCmd('pnpm', ['run', 'pm2:start'], showPM2Menu); break;
        case '2': runCmd('pnpm', ['run', 'pm2:restart'], showPM2Menu); break;
        case '3': runCmd('pnpm', ['run', 'pm2:stop'], showPM2Menu); break;
        case '4': runCmd('pnpm', ['run', 'pm2:logs'], showPM2Menu); break;
        case '5': runCmd('pnpm', ['run', 'pm2:monit'], showPM2Menu); break;
        case '6': runCmd('pnpm', ['run', 'pm2:delete'], showPM2Menu); break;
        case '0': showMenu(); break;
        default:
            console.log(`\n  ${c.red}✖ Opción inválida.${c.reset}`);
            setTimeout(showPM2Menu, 1200);
            break;
    }
}

function runCmd(command, args, callback) {
    console.log(`\n  ${c.blue}🔄 Ejecutando: ${command} ${args.join(' ')}...${c.reset}\n`);
    
    const proc = spawn(command, args, { 
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(__dirname, '..')
    });
    
    proc.on('close', (code) => {
        console.log(c.dim + `\n-------------------------------------------------------` + c.reset);
        if (code === 0) {
            console.log(`  ${c.green}✔ Proceso finalizado con éxito.${c.reset}`);
        } else {
            console.log(`  ${c.red}✖ Proceso terminado con código de error: ${code}${c.reset}`);
        }
        console.log(c.dim + `-------------------------------------------------------` + c.reset);
        
        rl.question(`\n  ${c.cyan}Presiona ENTER para volver al menú...${c.reset}`, () => {
            callback();
        });
    });
}

function handleChoice(choice) {
    switch (choice) {
        case '1':
            runCmd('pnpm', ['run', 'start'], showMenu);
            break;
        case '2':
            runCmd('pnpm', ['run', 'dev'], showMenu);
            break;
        case '3':
            runCmd('pnpm', ['run', 'build'], showMenu);
            break;
        case '4':
            runCmd('pnpm', ['run', 'clean'], showMenu);
            break;
        case '5':
            runCmd('node', ['bin/clean-logs.js'], showMenu);
            break;
        case '6':
            rl.question(`\n  ${c.red}⚠ ¿Seguro que quieres eliminar la sesión de WhatsApp? (s/n): ${c.reset}`, (ans) => {
                if (ans.toLowerCase() === 's' || ans.toLowerCase() === 'si' || ans.toLowerCase() === 'y') {
                    runCmd('pnpm', ['run', 'reset:wa'], showMenu);
                } else {
                    showMenu();
                }
            });
            break;
        case '7':
            runCmd('pnpm', ['install'], showMenu);
            break;
        case '8':
            showPM2Menu();
            break;
        case '9':
            showFoldersMenu();
            break;
        case '10':
            console.log(`\n  ${c.magenta}🦊 ¡Sistema Desconectado! Hasta pronto.${c.reset}\n`);
            rl.close();
            process.exit(0);
            break;
        default:
            console.log(`\n  ${c.red}✖ Opción inválida.${c.reset}`);
            setTimeout(showMenu, 1200);
            break;
    }
}

showMenu();
