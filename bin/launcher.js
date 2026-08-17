const { spawn, exec, execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const c = {
    reset: "\x1b[0m", dim: "\x1b[2m", bright: "\x1b[1m",
    cyan: "\x1b[36m", magenta: "\x1b[35m", green: "\x1b[32m",
    yellow: "\x1b[33m", red: "\x1b[31m", blue: "\x1b[34m",
    bgCyan: "\x1b[46m", bgMagenta: "\x1b[45m", bgBlue: "\x1b[44m"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let hasAnimatedLogo = false;

async function printAnimatedLines(lines, delay = 50) {
    for (const line of lines) {
        console.log(line);
        if (delay > 0) await sleep(delay);
    }
}

async function showBanner(title = "Control Maestro") {
    console.clear();
    const logoLines = [
        c.cyan + "    ██████╗  ██████╗ ████████╗███╗   ███╗███████╗██████╗ " + c.reset,
        c.cyan + "    ██╔══██╗██╔═══██╗╚══██╔══╝████╗ ████║██╔════╝██╔══██╗" + c.reset,
        c.cyan + "    ██████╦╝██║   ██║   ██║   ██╔████╔██║█████╗  ██████╔╝" + c.reset,
        c.cyan + "    ██╔══██╗██║   ██║   ██║   ██║╚██╔╝██║██╔══╝  ██╔══██╗" + c.reset,
        c.cyan + "    ██████╦╝╚██████╔╝   ██║   ██║ ╚═╝ ██║███████╗██║  ██║" + c.reset,
        c.cyan + "    ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝" + c.reset,
        c.yellow + "                 ✨ CRM & WEBHOOKS EDITION ✨" + c.reset
    ];

    if (!hasAnimatedLogo) {
        await printAnimatedLines(logoLines, 80);
        hasAnimatedLogo = true;
    } else {
        await printAnimatedLines(logoLines, 0);
    }

    const titleSpace = " ".repeat(Math.max(0, (55 - title.length) / 2));
    
    console.log(`\n${c.magenta}    ╭───────────────────────────────────────────────────────╮${c.reset}`);
    console.log(`${c.magenta}    │${titleSpace}${c.bright}${title}${c.reset}${titleSpace}  ${c.magenta}│${c.reset}`);
    const osStr = process.platform.toUpperCase().padEnd(10);
    const verStr = pkg.version.padEnd(7);
    const dirStr = path.basename(path.resolve(__dirname, '..')).substring(0,20).padEnd(20);

    console.log(`${c.magenta}    ├───────────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.magenta}    │${c.reset}  ${c.cyan}OS:${c.reset} \x1b[33m${osStr}\x1b[0m ${c.cyan}VER:${c.reset} \x1b[33m${verStr}\x1b[0m ${c.cyan}DIR:${c.reset} \x1b[33m${dirStr}\x1b[0m${c.magenta}│${c.reset}`);
    console.log(`${c.magenta}    ╰───────────────────────────────────────────────────────╯${c.reset}\n`);

    // Alerta de compatibilidad con Node 24 (EPERM / Access Violation)
    if (process.versions.node.startsWith('24.')) {
        console.log(`    ${c.bgRed}${c.bright} ⚠️ ADVERTENCIA DE COMPATIBILIDAD (NODE.JS v24 DETECTADO) ${c.reset}`);
        console.log(`    ${c.red}Estás usando Node.js v${process.versions.node}. Esta versión causa errores EPERM${c.reset}`);
        console.log(`    ${c.red}y Access Violation al compilar dependencias nativas en Windows.${c.reset}`);
        console.log(`    ${c.yellow}👉 Solución recomendada: Instala Node.js v22 LTS.${c.reset}`);
        console.log(`    ${c.yellow}👉 Más info en: TROUBLESHOOTING.md${c.reset}\n`);
    }
}

async function showMenu() {
    await showBanner("Control Maestro Principal");
    console.log(`    ${c.green}╭─▶ Sistema y Servidor${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.green}[1]${c.reset} 🚀 Iniciar Servidor     ${c.dim}(Modo Producción)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.green}[2]${c.reset} ⚡ Iniciar Desarrollo   ${c.dim}(Live Reload + Turbopack)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.green}[3]${c.reset} 📦 Compilar Frontend    ${c.dim}(Build Next.js)${c.reset}`);
    console.log(`    ${c.green}╰────────────────────────────────────────${c.reset}\n`);
    
    console.log(`    ${c.blue}╭─▶ Utilidades y Mantenimiento${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[4]${c.reset} 🧹 Limpiar Cachés       ${c.dim}(Clean .next)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[5]${c.reset} 💾 Optimizar Logs       ${c.dim}(Vacuum)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[6]${c.reset} 🔑 Forzar Nuevo QR      ${c.dim}(Cerrar Sesión WA)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[7]${c.reset} 📥 Actualizar Paquetes  ${c.dim}(pnpm install)${c.reset}`);
    console.log(`    ${c.blue}╰────────────────────────────────────────${c.reset}\n`);

    console.log(`    ${c.yellow}╭─▶ Herramientas Avanzadas${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[8]${c.reset} ⚙️ Gestión de PM2       ${c.dim}(Ejecución 24/7)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[9]${c.reset} 📁 Explorador           ${c.dim}(Abrir carpetas locales)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[10]${c.reset} 📥 Git Update        ${c.dim}(Actualización remota)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[12]${c.reset} 🗄️ Reparar SQLite    ${c.dim}(Fix Base de Datos NDK)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[13]${c.reset} 🌐 Reparar Túnel     ${c.dim}(Fix Cloudflared Público)${c.reset}`);
    console.log(`    ${c.yellow}╰────────────────────────────────────────${c.reset}\n`);

    console.log(`    ${c.red}[11] ❌ Salir del Sistema${c.reset}\n`);

    const envExists = fs.existsSync(path.resolve(__dirname, '../.env'));
    const nextExists = fs.existsSync(path.resolve(__dirname, '../.next'));
    
    if (!envExists || !nextExists) {
        console.log(`    ${c.bgYellow}${c.red}${c.bright} 🌟 ¡BIENVENIDO A BOTMARE! (PASOS DE PRIMERA VEZ) 🌟 ${c.reset}`);
        if (!envExists) console.log(`    ${c.yellow}👉 1. Configura tu archivo .env con tus contraseñas y API Keys.${c.reset}`);
        if (!nextExists) console.log(`    ${c.yellow}👉 2. Presiona [3] para Compilar el Frontend.${c.reset}`);
        console.log(`    ${c.yellow}👉 3. Presiona [1] para Iniciar el Servidor.${c.reset}`);
        console.log(`    ${c.red}⚠️  Nota: Si ves errores de SQLite al iniciar, usa la opción [12].${c.reset}\n`);
    } else {
        console.log(`    ${c.cyan}💡 Tip: Si acabas de actualizar o tienes errores, presiona [12] o [13].${c.reset}\n`);
    }
    
    rl.question(`    ${c.cyan}${c.bright}➤ Selecciona una acción [1-13]:${c.reset} `, (choice) => {
        handleChoice(choice.trim());
    });
}

async function showFoldersMenu() {
    await showBanner("Explorador de Carpetas");
    console.log(`    ${c.blue}╭─▶ Ubicaciones Locales${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[1]${c.reset} 📁 Carpeta Raíz del Proyecto`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[2]${c.reset} 📁 Base de Datos y Logs ${c.dim}(data/)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[3]${c.reset} 📁 Backups de Seguridad ${c.dim}(backups/)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[4]${c.reset} 📁 Sesión de WhatsApp   ${c.dim}(auth_info_baileys/)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.blue}[5]${c.reset} 📁 Multimedia           ${c.dim}(data/media/)${c.reset}`);
    console.log(`    ${c.blue}╰────────────────────────────────────────${c.reset}\n`);
    console.log(`    ${c.cyan}[0] ⬅ Volver al Menú Principal${c.reset}\n`);
    
    rl.question(`    ${c.cyan}${c.bright}➤ Selecciona la carpeta [0-5]:${c.reset} `, (choice) => {
        handleFoldersChoice(choice.trim());
    });
}

async function showUpdateMenu() {
    await showBanner("Centro de Actualizaciones");
    console.log(`    ${c.yellow}╭─▶ Orígenes de Actualización${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.green}[1]${c.reset} 🌟 Actualizar a Estable ${c.dim}(Tags de GitHub)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[2]${c.reset} 🚀 Actualizar a Dev     ${c.dim}(Rama main)${c.reset}`);
    console.log(`    ${c.yellow}╰────────────────────────────────────────${c.reset}\n`);
    console.log(`    ${c.cyan}[0] ⬅ Volver al Menú Principal${c.reset}\n`);
    
    rl.question(`    ${c.cyan}${c.bright}➤ Selecciona una acción [0-2]:${c.reset} `, (choice) => {
        handleUpdateChoice(choice.trim());
    });
}

async function showPM2Menu() {
    await showBanner("Gestor de PM2 (Background)");
    console.log(`    ${c.cyan}╭─▶ Control de Procesos${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.green}[1]${c.reset} ▶ Iniciar Bot    ${c.dim}(pm2:start)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.yellow}[2]${c.reset} 🔄 Reiniciar Bot  ${c.dim}(pm2:restart)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.red}[3]${c.reset} ⏹ Detener Bot    ${c.dim}(pm2:stop)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.cyan}[4]${c.reset} 📋 Ver Logs      ${c.dim}(pm2:logs)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.cyan}[5]${c.reset} 📊 Monitor       ${c.dim}(pm2:monit)${c.reset}`);
    console.log(`    ${c.dim}│${c.reset} ${c.red}[6]${c.reset} 🗑 Eliminar      ${c.dim}(pm2:delete)${c.reset}`);
    console.log(`    ${c.cyan}╰────────────────────────────────────────${c.reset}\n`);
    console.log(`    ${c.blue}[0] ⬅ Volver al Menú Principal${c.reset}\n`);
    
    rl.question(`    ${c.cyan}${c.bright}➤ Selecciona una acción [0-6]:${c.reset} `, (choice) => {
        handlePM2Choice(choice.trim());
    });
}

function openFolder(folderName) {
    const p = path.resolve(__dirname, '..', folderName);
    console.log(`\n    ${c.bgBlue}${c.bright} 📂 ABRIENDO ${c.reset} ${c.blue}${p}${c.reset}`);
    let cmd;
    switch (process.platform) {
        case 'darwin': cmd = `open "${p}"`; break;
        case 'win32': cmd = `start "" "${p}"`; break;
        default: cmd = `xdg-open "${p}"`; break;
    }
    exec(cmd, (err) => {
        if (err) console.log(`    ${c.red}✖ Fallo al abrir ventana.${c.reset}`);
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
        default: invalidChoice(showFoldersMenu); break;
    }
}

function handleUpdateChoice(choice) {
    switch (choice) {
        case '1':
            console.log(`\n    ${c.bgYellow}${c.bright} 🌟 BUSCANDO ACTUALIZACIÓN ${c.reset}`);
            try {
                execSync('git fetch --tags', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
                const tags = execSync('git tag --sort=-v:refname', { cwd: path.resolve(__dirname, '..') }).toString().trim().split(/\r?\n/);
                if (!tags[0]) throw new Error("No tags");
                console.log(`    ${c.green}✔ Tag estable: ${tags[0]}${c.reset}`);
                runCmd('git', ['checkout', tags[0]], showUpdateMenu);
            } catch (e) {
                console.log(`    ${c.red}✖ No se encontraron versiones o falló la conexión.${c.reset}`);
                setTimeout(showUpdateMenu, 2000);
            }
            break;
        case '2':
            console.log(`\n    ${c.bgYellow}${c.bright} 🚀 ACTUALIZANDO A MAIN ${c.reset}`);
            runCmd('git', ['checkout', 'main'], () => {
                runCmd('git', ['pull', 'origin', 'main'], showUpdateMenu);
            });
            break;
        case '0': showMenu(); break;
        default: invalidChoice(showUpdateMenu); break;
    }
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
        default: invalidChoice(showPM2Menu); break;
    }
}

async function runCmd(command, args, callback) {
    console.log(`\n    ${c.bgCyan}${c.bright} ⚙️ EJECUTANDO ${c.reset} ${c.cyan}${command} ${args.join(' ')}${c.reset}\n`);
    
    const proc = spawn(command, args, { 
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(__dirname, '..')
    });
    
    proc.on('close', (code) => {
        console.log(`\n    ${c.dim}───────────────────────────────────────────────────────${c.reset}`);
        if (code === 0) {
            console.log(`    ${c.green}✔ Proceso finalizado exitosamente.${c.reset}`);
        } else {
            console.log(`    ${c.red}✖ Proceso terminado con código de error: ${code}${c.reset}`);
        }
        console.log(`    ${c.dim}───────────────────────────────────────────────────────${c.reset}`);
        
        rl.question(`\n    ${c.cyan}${c.bright}➤ Presiona ENTER para continuar...${c.reset}`, () => {
            callback();
        });
    });
}

function invalidChoice(callback) {
    console.log(`\n    ${c.bgRed}${c.bright} ✖ Opción Inválida ${c.reset}`);
    setTimeout(callback, 1000);
}

function handleChoice(choice) {
    switch (choice) {
        case '1': runCmd('pnpm', ['run', 'start'], showMenu); break;
        case '2': runCmd('pnpm', ['run', 'dev'], showMenu); break;
        case '3': runCmd('pnpm', ['run', 'build'], showMenu); break;
        case '4': runCmd('pnpm', ['run', 'clean'], showMenu); break;
        case '5': runCmd('node', ['bin/clean-logs.js'], showMenu); break;
        case '6':
            rl.question(`\n    ${c.bgRed}${c.bright} ⚠ ¿ELIMINAR SESIÓN WHATSAPP? (s/n): ${c.reset} `, (ans) => {
                if (['s','si','y','yes'].includes(ans.toLowerCase())) {
                    runCmd('pnpm', ['run', 'reset:wa'], showMenu);
                } else showMenu();
            });
            break;
        case '7': runCmd('pnpm', ['install', '--ignore-scripts'], showMenu); break;
        case '8': showPM2Menu(); break;
        case '9': showFoldersMenu(); break;
        case '10': showUpdateMenu(); break;
        case '11':
            console.log(`\n    ${c.bgMagenta}${c.bright} 🦊 ¡Sistema Desconectado! Hasta la próxima. ${c.reset}\n`);
            rl.close();
            process.exit(0);
            break;
        case '12':
            console.log(`\n    ${c.bgYellow}${c.bright} 🗄️ RECONSTRUYENDO BASE DE DATOS NATIVA (SQLITE) ${c.reset}\n`);
            runCmd('pnpm', ['rebuild', 'better-sqlite3'], showMenu);
            break;
        case '13':
            console.log(`\n    ${c.bgCyan}${c.bright} 🌐 REINSTALANDO TÚNEL PÚBLICO (CLOUDFLARED DE CERO) ${c.reset}\n`);
            console.log(`    ${c.cyan}Eliminando binario viejo para burlar bloqueos y bajando uno limpio...${c.reset}`);
            
            const isTermux = fs.existsSync('/data/data/com.termux');
            if (isTermux) {
                console.log(`    ${c.yellow}⚠ Entorno Termux/Android detectado. Utilizando gestor de paquetes del sistema (pkg)...${c.reset}\n`);
                runCmd('pkg', ['uninstall', 'cloudflared', '-y'], () => {
                    runCmd('pkg', ['install', 'cloudflared', '-y'], showMenu);
                });
            } else {
                runCmd('pnpm', ['remove', 'cloudflared'], () => {
                    runCmd('pnpm', ['install', 'cloudflared', '--ignore-scripts'], showMenu);
                });
            }
            break;
        default: invalidChoice(showMenu); break;
    }
}

// Iniciar aplicación
showMenu();
