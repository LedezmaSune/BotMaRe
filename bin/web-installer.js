/**
 * ═══════════════════════════════════════════════════════════════════
 *  🦊 BotMaRe AI - Gestor de Descargas e Instalador Web Nativo
 *  Cero Dependencias Externas (Solo módulos nativos de Node.js)
 * ═══════════════════════════════════════════════════════════════════
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT || '8000', 10);
const ROOT_DIR = path.resolve(__dirname, '..');

// Estado global de la instalación
const state = {
    running: false,
    progressPercent: 0,
    packagesDone: 0,
    packagesTotal: 803,
    statusText: 'Esperando para iniciar...',
    step: 1, // 1: Chequeo, 2: Descargas, 3: SQLite, 4: Dashboard, 5: Listo
    logs: [],
    childProcess: null,
    isTermux: fs.existsSync('/data/data/com.termux'),
    arch: os.arch(),
    platform: os.platform(),
    completed: false
};

// Clientes SSE (Server-Sent Events) conectados
const sseClients = new Set();

function broadcastEvent(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
        try {
            res.write(payload);
        } catch {
            sseClients.delete(res);
        }
    }
}

function appendLog(line) {
    if (!line) return;
    const clean = line.toString().trim();
    if (!clean) return;

    // Extraer progreso si viene formato de pnpm
    // Ej: "Progress: resolved 803, reused 794, downloaded 5, added 799"
    const progressMatch = clean.match(/Progress:.*(?:added|reused)\s+(\d+)/i);
    const totalMatch = clean.match(/resolved\s+(\d+)/i);
    if (totalMatch && totalMatch[1]) {
        state.packagesTotal = parseInt(totalMatch[1], 10);
    }
    if (progressMatch && progressMatch[1]) {
        state.packagesDone = Math.min(parseInt(progressMatch[1], 10), state.packagesTotal);
        state.progressPercent = Math.min(Math.round((state.packagesDone / state.packagesTotal) * 100), 99);
        state.statusText = `Descargando paquetes (${state.packagesDone} / ${state.packagesTotal})...`;
        state.step = 2;
    } else if (clean.includes('Downloading')) {
        state.statusText = clean.substring(0, 60);
    }

    const timestamp = new Date().toLocaleTimeString();
    state.logs.push(`[${timestamp}] ${clean}`);
    if (state.logs.length > 300) state.logs.shift();

    broadcastEvent({
        type: 'log',
        log: `[${timestamp}] ${clean}`,
        progress: state.progressPercent,
        done: state.packagesDone,
        total: state.packagesTotal,
        statusText: state.statusText,
        step: state.step
    });
}

function runInstallation() {
    if (state.running) return;
    state.running = true;
    state.step = 2;
    state.statusText = 'Iniciando gestor de descargas en modo secuencial...';
    appendLog('🚀 Iniciando instalación de dependencias...');

    // Argumentos optimizados para pnpm (modo secuencial 1x1 y timeouts de 30 min)
    const args = [
        'install',
        '--ignore-scripts',
        '--network-concurrency', '1',
        '--fetch-timeout', '1800000',
        '--fetch-retries', '10'
    ];

    appendLog(`Ejecutando: pnpm ${args.join(' ')}`);

    const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, {
        cwd: ROOT_DIR,
        shell: true
    });

    state.childProcess = child;

    child.stdout.on('data', (data) => {
        const text = data.toString();
        text.split('\n').forEach(line => appendLog(line));
    });

    child.stderr.on('data', (data) => {
        const text = data.toString();
        text.split('\n').forEach(line => appendLog(line));
    });

    child.on('close', (code) => {
        state.childProcess = null;
        if (code === 0) {
            state.progressPercent = 95;
            state.statusText = 'Librerías completadas. Verificando SQLite y Dashboard...';
            appendLog('✓ Dependencias descargadas exitosamente.');
            finalizeInstallation();
        } else {
            state.running = false;
            state.statusText = 'Descarga pausada o con error. Puedes reanudarla cuando desees.';
            appendLog(`⚠ Proceso detenido con código: ${code}. Puedes pulsar "Reanudar".`);
            broadcastEvent({ type: 'status', running: false, statusText: state.statusText });
        }
    });

    child.on('error', (err) => {
        state.running = false;
        state.statusText = `Error de ejecución: ${err.message}`;
        appendLog(`✗ Error: ${err.message}`);
        broadcastEvent({ type: 'status', running: false, statusText: state.statusText });
    });
}

function finalizeInstallation() {
    state.step = 3;
    state.statusText = 'Verificando SQLite y Dashboard precompilado...';

    // 1. Compilar SQLite en Termux si aplica
    if (state.isTermux) {
        appendLog('📱 Verificando módulo SQLite en Termux...');
        try {
            require(path.join(ROOT_DIR, 'node_modules/better-sqlite3'));
            appendLog('✓ better-sqlite3 ya está operativo.');
        } catch {
            appendLog('Compilando better-sqlite3 de forma nativa para Android Clang...');
            try {
                const termuxPrefix = '/data/data/com.termux/files/usr';
                const homeDir = process.env.HOME || '/data/data/com.termux/files/home';
                const gypDir = path.join(homeDir, '.gyp');
                if (!fs.existsSync(gypDir)) fs.mkdirSync(gypDir, { recursive: true });
                fs.writeFileSync(path.join(gypDir, 'include.gypi'), "{'variables':{'android_ndk_path':''}}\n");

                try {
                    execSync(`pnpm rebuild better-sqlite3 --build-from-source --sqlite="${termuxPrefix}"`, {
                        cwd: ROOT_DIR,
                        stdio: 'pipe',
                        env: {
                            ...process.env,
                            CC: 'clang',
                            CXX: 'clang++',
                            LINK: 'clang++',
                            npm_config_build_from_source: 'true',
                            npm_config_sqlite: termuxPrefix
                        }
                    });
                    appendLog('✓ better-sqlite3 compilado exitosamente.');
                } catch {
                    execSync(`npm rebuild better-sqlite3 --build-from-source --sqlite="${termuxPrefix}"`, {
                        cwd: ROOT_DIR,
                        stdio: 'pipe',
                        env: {
                            ...process.env,
                            CC: 'clang',
                            CXX: 'clang++',
                            LINK: 'clang++',
                            npm_config_build_from_source: 'true',
                            npm_config_sqlite: termuxPrefix
                        }
                    });
                    appendLog('✓ better-sqlite3 compilado exitosamente (vía npm).');
                }
            } catch (e) {
                appendLog(`⚠ Advertencia al compilar better-sqlite3: ${e.message}`);
            }
        }
    }

    // 2. Descomprimir Dashboard
    state.step = 4;
    state.statusText = 'Descomprimiendo Dashboard precompilado...';
    const outDir = path.join(ROOT_DIR, 'out');
    const tarFile = path.join(ROOT_DIR, 'bin/dashboard-out.tar.gz');

    if (fs.existsSync(tarFile) && (!fs.existsSync(outDir) || fs.readdirSync(outDir).length === 0)) {
        appendLog('📦 Extrayendo paquete visual del Dashboard (544 KB)...');
        fs.mkdirSync(outDir, { recursive: true });
        try {
            execSync(`tar -xzf "${tarFile}" -C "${outDir}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
            appendLog('✓ Dashboard listo instantáneamente.');
        } catch (e) {
            appendLog(`⚠ Fallo al descomprimir con tar: ${e.message}`);
        }
    }

    state.step = 5;
    state.running = false;
    state.completed = true;
    state.progressPercent = 100;
    state.statusText = '¡Instalación Completada con Éxito!';
    appendLog('🎉 ¡BotMaRe está 100% listo para iniciar!');

    broadcastEvent({
        type: 'completed',
        progress: 100,
        statusText: state.statusText,
        step: 5
    });
}

function pauseInstallation() {
    if (state.childProcess) {
        appendLog('⏸ Pausando descarga...');
        try {
            state.childProcess.kill('SIGINT');
        } catch {}
        state.running = false;
        state.statusText = 'Descarga pausada por el usuario.';
        broadcastEvent({ type: 'status', running: false, statusText: state.statusText });
    }
}

// Generador de la Interfaz Web Glassmorphism (HTML / CSS puro incrustado)
function renderHTML() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>🦊 BotMaRe - Asistente y Gestor de Descargas Web</title>
    <style>
        :root {
            --bg: #090d16;
            --surface: rgba(18, 25, 42, 0.75);
            --border: rgba(99, 102, 241, 0.2);
            --primary: #6366f1;
            --primary-glow: rgba(99, 102, 241, 0.4);
            --accent: #22d3ee;
            --success: #10b981;
            --text: #f8fafc;
            --text-muted: #94a3b8;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 1.5rem 1rem; overflow-x: hidden; }
        
        /* Glow background decorations */
        .glow-1 { position: fixed; top: -100px; left: -100px; width: 350px; height: 350px; background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%); z-index: -1; filter: blur(50px); pointer-events: none; }
        .glow-2 { position: fixed; bottom: -100px; right: -100px; width: 350px; height: 350px; background: radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, transparent 70%); z-index: -1; filter: blur(50px); pointer-events: none; }

        .container { width: 100%; max-width: 680px; display: flex; flex-direction: column; gap: 1.25rem; }
        
        /* Header Card */
        .card { background: var(--surface); border: 1px solid var(--border); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 1.25rem; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .brand { display: flex; align-items: center; gap: 0.85rem; }
        .logo { font-size: 2.2rem; filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.5)); }
        .brand-text h1 { font-size: 1.35rem; font-weight: 800; background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .brand-text p { font-size: 0.8rem; color: var(--text-muted); }
        
        .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: var(--accent); }
        .badge.online { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: var(--success); }

        /* Progress Section */
        .progress-box { display: flex; flex-direction: column; gap: 0.85rem; }
        .progress-labels { display: flex; justify-content: space-between; align-items: flex-end; }
        .percent { font-size: 2.5rem; font-weight: 900; color: var(--accent); text-shadow: 0 0 20px rgba(34, 211, 238, 0.4); line-height: 1; }
        .packages-count { font-size: 0.85rem; color: var(--text-muted); text-align: right; }
        
        .progress-bar-bg { width: 100%; height: 16px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.08); }
        .progress-bar-fill { width: 0%; height: 100%; background: linear-gradient(90deg, #6366f1 0%, #22d3ee 100%); border-radius: 999px; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 15px rgba(34, 211, 238, 0.6); }

        .status-pill { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #e2e8f0; background: rgba(255,255,255,0.04); padding: 0.6rem 0.85rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(34, 211, 238, 0.2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; display: none; }
        .status-pill.active .spinner { display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Steps Timeline */
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
        .step-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.85rem; padding: 0.75rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 0.3rem; transition: all 0.3s ease; }
        .step-item.active { background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.4); color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); }
        .step-item.done { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: var(--success); }
        .step-icon { font-size: 1.15rem; }

        /* Action Buttons */
        .actions { display: flex; gap: 0.75rem; }
        .btn { flex: 1; padding: 0.95rem 1.25rem; border-radius: 0.85rem; font-size: 0.95rem; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease; text-decoration: none; }
        .btn:active { transform: scale(0.98); }
        
        .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; box-shadow: 0 4px 15px var(--primary-glow); }
        .btn-primary:hover { filter: brightness(1.1); }
        .btn-pause { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
        .btn-pause:hover { background: rgba(239, 68, 68, 0.25); }
        .btn-launch { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); display: none; }
        .btn-launch:hover { filter: brightness(1.1); }

        /* Terminal Console */
        .terminal { background: #040711; border: 1px solid rgba(255,255,255,0.08); border-radius: 0.85rem; padding: 0.85rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.75rem; color: #a5f3fc; height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem; }
        .terminal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.4rem; }
        
        @media (max-width: 480px) {
            .steps { grid-template-columns: repeat(2, 1fr); }
            .header { flex-direction: column; align-items: flex-start; }
            .badge { align-self: flex-start; }
        }
    </style>
</head>
<body>
    <div class="glow-1"></div>
    <div class="glow-2"></div>

    <div class="container">
        <!-- Header -->
        <div class="card header">
            <div class="brand">
                <div class="logo">🦊</div>
                <div class="brand-text">
                    <h1>BotMaRe Web Installer</h1>
                    <p>Gestor Inteligente de Descargas & Preparación</p>
                </div>
            </div>
            <div class="badge ${state.isTermux ? 'online' : ''}">
                <span>${state.isTermux ? '📱 Termux Android' : '💻 Servidor / PC'}</span>
                <span>(${state.arch})</span>
            </div>
        </div>

        <!-- Progress Card -->
        <div class="card progress-box">
            <div class="progress-labels">
                <div>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Progreso Total</span>
                    <div class="percent" id="percentText">${state.progressPercent}%</div>
                </div>
                <div class="packages-count" id="countText">${state.packagesDone} / ${state.packagesTotal} paquetes</div>
            </div>

            <div class="progress-bar-bg">
                <div class="progress-bar-fill" id="progressBar" style="width: ${state.progressPercent}%;"></div>
            </div>

            <div class="status-pill ${state.running ? 'active' : ''}" id="statusPill">
                <div class="spinner"></div>
                <span id="statusText">${state.statusText}</span>
            </div>

            <!-- Steps -->
            <div class="steps">
                <div class="step-item ${state.step >= 1 ? (state.step > 1 ? 'done' : 'active') : ''}" id="step1">
                    <span class="step-icon">🔍</span>
                    <span>1. Sistema</span>
                </div>
                <div class="step-item ${state.step >= 2 ? (state.step > 2 ? 'done' : 'active') : ''}" id="step2">
                    <span class="step-icon">📦</span>
                    <span>2. Paquetes</span>
                </div>
                <div class="step-item ${state.step >= 3 ? (state.step > 3 ? 'done' : 'active') : ''}" id="step3">
                    <span class="step-icon">🗄️</span>
                    <span>3. SQLite</span>
                </div>
                <div class="step-item ${state.step >= 4 ? (state.step > 4 ? 'done' : 'active') : ''}" id="step4">
                    <span class="step-icon">🎨</span>
                    <span>4. Dashboard</span>
                </div>
            </div>
        </div>

        <!-- Controls -->
        <div class="actions">
            <button class="btn btn-primary" id="startBtn" onclick="startDownload()">
                <span>🚀</span> <span id="startBtnText">Iniciar Descargas</span>
            </button>
            <button class="btn btn-pause" id="pauseBtn" onclick="pauseDownload()" style="display: none;">
                <span>⏸</span> <span>Pausar</span>
            </button>
            <button class="btn btn-launch" id="launchBtn" onclick="launchBot()">
                <span>⚡</span> <span>Iniciar BotMaRe</span>
            </button>
        </div>

        <!-- Live Terminal Logs -->
        <div class="card" style="padding: 1rem;">
            <div class="terminal-header">
                <span>Registro de Consola en Vivo</span>
                <span id="logCounter">${state.logs.length} líneas</span>
            </div>
            <div class="terminal" id="terminalLog">
                ${state.logs.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
            </div>
        </div>
    </div>

    <script>
        let isRunning = ${state.running};
        let isCompleted = ${state.completed};

        function updateUIState() {
            const startBtn = document.getElementById('startBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            const launchBtn = document.getElementById('launchBtn');
            const startBtnText = document.getElementById('startBtnText');
            const statusPill = document.getElementById('statusPill');

            if (isCompleted) {
                startBtn.style.display = 'none';
                pauseBtn.style.display = 'none';
                launchBtn.style.display = 'flex';
                statusPill.classList.remove('active');
            } else if (isRunning) {
                startBtn.style.display = 'none';
                pauseBtn.style.display = 'flex';
                launchBtn.style.display = 'none';
                statusPill.classList.add('active');
            } else {
                startBtn.style.display = 'flex';
                pauseBtn.style.display = 'none';
                launchBtn.style.display = 'none';
                startBtnText.textContent = ${state.progressPercent} > 0 ? 'Reanudar Descargas' : 'Iniciar Descargas';
                statusPill.classList.remove('active');
            }
        }
        updateUIState();

        // Server-Sent Events (SSE) en tiempo real
        const evtSource = new EventSource('/api/events');
        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    const term = document.getElementById('terminalLog');
                    const line = document.createElement('div');
                    line.textContent = data.log;
                    term.appendChild(line);
                    term.scrollTop = term.scrollHeight;

                    document.getElementById('percentText').textContent = data.progress + '%';
                    document.getElementById('progressBar').style.width = data.progress + '%';
                    document.getElementById('countText').textContent = data.done + ' / ' + data.total + ' paquetes';
                    document.getElementById('statusText').textContent = data.statusText;
                    updateStepIndicators(data.step);
                } else if (data.type === 'completed') {
                    isCompleted = true;
                    isRunning = false;
                    document.getElementById('percentText').textContent = '100%';
                    document.getElementById('progressBar').style.width = '100%';
                    document.getElementById('statusText').textContent = data.statusText;
                    updateStepIndicators(5);
                    updateUIState();
                } else if (data.type === 'status') {
                    isRunning = data.running;
                    document.getElementById('statusText').textContent = data.statusText;
                    updateUIState();
                }
            } catch(e) {}
        };

        function updateStepIndicators(currentStep) {
            for (let i = 1; i <= 4; i++) {
                const el = document.getElementById('step' + i);
                if (el) {
                    el.className = 'step-item';
                    if (currentStep > i) el.classList.add('done');
                    else if (currentStep === i) el.classList.add('active');
                }
            }
        }

        async function startDownload() {
            isRunning = true;
            updateUIState();
            await fetch('/api/start', { method: 'POST' });
        }

        async function pauseDownload() {
            isRunning = false;
            updateUIState();
            await fetch('/api/pause', { method: 'POST' });
        }

        async function launchBot() {
            alert('¡Lanzando BotMaRe! La página se redirigirá al Dashboard en 5 segundos...');
            await fetch('/api/launch', { method: 'POST' });
            setTimeout(() => { window.location.href = '/'; }, 4000);
        }
    </script>
</body>
</html>`;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Servidor HTTP Nativo con cero dependencias
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderHTML());
        return;
    }

    if (url.pathname === '/api/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('\n');
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
    }

    if (url.pathname === '/api/start' && req.method === 'POST') {
        runInstallation();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    if (url.pathname === '/api/pause' && req.method === 'POST') {
        pauseInstallation();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    if (url.pathname === '/api/launch' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Iniciando servidor de producción...' }));
        
        setTimeout(() => {
            console.log('\n[BotMaRe] Transfiriendo control a pnpm start...');
            server.close(() => {
                const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['start'], {
                    cwd: ROOT_DIR,
                    stdio: 'inherit',
                    detached: false
                });
            });
        }, 1000);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🦊 ========================================================');
    console.log('   BOTMARE AI - GESTOR DE DESCARGAS E INSTALACIÓN WEB');
    console.log('========================================================');
    console.log(`🌐 Servidor de instalación activo con éxito:`);
    console.log(`   👉 http://localhost:${PORT}`);
    console.log(`   👉 http://127.0.0.1:${PORT}`);
    console.log('========================================================\n');
});

