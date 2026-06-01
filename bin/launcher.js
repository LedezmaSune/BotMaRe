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
    console.log(`  ${c.red}[8]${c.reset} ❌ Salir del Sistema`);
    console.log(c.dim + "\n===========================================================" + c.reset);
    
    rl.question(`\n  ${c.cyan}➤ Selecciona una acción [1-8]:${c.reset} `, (choice) => {
        handleChoice(choice.trim());
    });
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
