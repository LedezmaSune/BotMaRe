import dotenv from 'dotenv';
dotenv.config(); // Cargado en la primera línea para evitar que otros imports dependientes de variables de entorno fallen

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { globalLimiter } from './middleware/security';
import { Spinner, drawBanner, colors } from './utils/cli';

// Core & Infrastructure
import { Bot } from './core/bot';
import { SystemUtils } from './core/system';
import { TunnelService } from './core/tunnel';
import { NotificationService } from './telegram/notification.service';
import { NotificationHub } from './core/notificationHub';

// Components
import { createMainRouter } from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { basicAuth, validateCredentials } from './middleware/auth.middleware';
import { loggingMiddleware } from './middleware/logger';
import { Scheduler } from './modules/scheduling/scheduler';
import { ReminderService } from './modules/reminders/reminder.service';
import { initTelegramBot } from './telegram/bot';
import { initTools } from './tools/index';
import { BackupService } from './modules/system/backup.service';
import { initDB } from './core/dbManager';

// Prevenir caídas del servidor por excepciones no controladas o promesas rechazadas
process.on('uncaughtException', (err) => {
    console.error('💥 [CRÍTICO] Excepción no controlada (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [CRÍTICO] Promesa rechazada no controlada (Unhandled Rejection) en:', promise, 'razón:', reason);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware de Autenticación para WebSockets
io.use((socket, next) => {
    const authHeader = socket.handshake.headers.authorization || socket.handshake.auth?.token;
    // Si no hay encabezado en entorno local de desarrollo, permitir la conexión
    if (!authHeader && process.env.NODE_ENV === 'development') {
        return next();
    }
    if (authHeader) {
        const b64auth = authHeader.replace(/^Basic\s+/i, '');
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
        if (validateCredentials(login, password)) {
            return next();
        }
    }
    // Permitir acceso solo si no se ha configurado autenticación estricta en dev o si las credenciales son válidas
    const userDefined = process.env.DASHBOARD_USER;
    if (!userDefined && !authHeader) {
        return next();
    }
    const err = new Error("Authentication error: Credenciales inválidas para WebSocket.");
    return next(err);
});

app.use(cors({
    origin: true,
    credentials: true
}));

app.set('trust proxy', 1);


// 1. Seguridad de Cabeceras (Configuración Pro-Dashboard)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:", "http:", "https:"],
            upgradeInsecureRequests: null,
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Limitador de Peticiones Global
app.use('/api', globalLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- LOGGING ---
app.use(loggingMiddleware);

// --- NUEVA ARQUITECTURA MODULAR ---
const bot = new Bot(io);
const messageService = bot.getMessageService();
const reminderService = new ReminderService();

// Inicializar NotificationHub
NotificationHub.init(io, messageService);

// El Dashboard (estático) primero
const isPkg = (process as any).pkg;
const frontendPath = isPkg 
    ? path.join(path.dirname(process.execPath), 'frontend')
    : path.join(process.cwd(), 'out');

if (process.env.NODE_ENV === 'development' && !isPkg) {
    app.use('/', createProxyMiddleware({
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        pathFilter: (path: string) => {
            const isApi = path.startsWith('/api') || path.startsWith('/socket.io');
            return !isApi;
        }
    }));
} else {
    app.use(express.static(frontendPath));
}

// La seguridad SOLO para la API y rutas sensibles
app.use(basicAuth);

// Routes Configuration
app.use('/api', createMainRouter(bot.getSocketAdapter()));

if (!(process.env.NODE_ENV === 'development' && !isPkg)) {
    app.get(/.*/, (req: any, res: any) => {
        if (!req.path.startsWith('/api')) {
            // Soporte para deep-linking en export estático de Next.js
            const safePath = req.path.replace(/^(\.\.(\/|\\|$))+/, '');
            const targetFile = safePath === '/' ? 'index.html' : `${safePath}.html`;
            
            // Usamos la opción 'root' nativa de Express que bloquea Path Traversal
            // por defecto y evitamos construir la ruta manualmente para el linter.
            res.sendFile(targetFile, { root: frontendPath }, (err: any) => {
                if (err) {
                    // Fallback a index.html para rutas no encontradas (SPA mode)
                    res.sendFile('index.html', { root: frontendPath }, (err2: any) => {
                        if (err2) {
                            res.status(404).send('No se encontraron los archivos del Dashboard.');
                        }
                    });
                }
            });
        }
    });
}

app.use(errorHandler);

// WebSocket Status Handlers
io.on('connection', (socket: any) => {
    const status = bot.getStatus();
    socket.emit('status', status.state);
    if (status.qr) socket.emit('qr', status.qr);
});

const PORT = process.env.PORT || 8000;

/**
 * Bootstrap Application
 */
async function bootstrap() {
    await drawBanner();
    
    // En Docker el archivo físico .env no se copia dentro del contenedor, sino que se inyecta en memoria.
    // Comprobamos si NO hay archivo físico Y TAMPOCO hay variables de IA inyectadas en memoria.
    if (!fs.existsSync(path.join(process.cwd(), '.env')) && !process.env.GROQ_MODEL && !process.env.GEMINI_MODEL && !process.env.OPENAI_MODEL) {
        try {
            const { startSetupServer } = await import('../setup-web/server');
            await startSetupServer();
            return;
        } catch (e) {
            console.error("\n[FATAL] No se detectó un archivo .env ni variables de entorno configuradas.");
            console.error("-> Si usas Docker, asegúrate de tener tu archivo .env junto al docker-compose.yml.");
            process.exit(1);
        }
    }

    const s0 = new Spinner("Validando Entorno...");
    s0.start();
    try {
        SystemUtils.ensureDirs();
        SystemUtils.validateEnv();
        s0.succeed("Carpetas del sistema y .env validados.");
    } catch (e: any) {
        s0.fail(`Error de validación: ${e.message}`);
        process.exit(1);
    }

    const s1 = new Spinner("Inicializando Almacenamiento y Memoria...");
    s1.start();
    try {
        await initDB();
        s1.succeed("Base de Datos y Caché listos.");
    } catch (e: any) {
        s1.fail(`Error al inicializar base de datos: ${e.message}`);
    }

    const s2 = new Spinner("Verificando Conectividad y Acceso Global...");
    s2.start();
    const tunnel = TunnelService.getInstance();
    let tunnelUrl = null;
    try {
        tunnelUrl = await tunnel.start(Number(PORT));
        if (tunnelUrl) s2.succeed(`Túnel establecido.`);
        else s2.info(`Solo acceso local disponible.`);
    } catch (e) {
        s2.info(`No se pudo establecer el túnel. Solo acceso local.`);
    }

    const s3 = new Spinner("Desplegando Servidor y Dashboard...");
    s3.start();

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            s3.fail(`El puerto ${PORT} ya está en uso por otro proceso.`);
            console.error(`\n❌ [PUERTO OCUPADO] No se pudo iniciar el servidor en el puerto ${PORT}.`);
            console.error(`💡 Sugerencia: Cierra la instancia previa ejecutando en PowerShell:`);
            console.error(`   Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`);
            process.exit(1);
        } else {
            s3.fail(`Error al iniciar servidor: ${err.message}`);
            console.error(err);
            process.exit(1);
        }
    });

    server.listen(Number(PORT), '0.0.0.0', async () => {
        s3.succeed("Servidor HTTP Online.");
        const localIP = SystemUtils.getLocalIP();
        
        console.log(`\n${colors.dim}=======================================================${colors.reset}`);
        const brand = process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe';
        console.log(`🦊 ${colors.fg.cyan}MOTOR ${brand.toUpperCase()} ACTIVADO${colors.reset}`);
        console.log(`${colors.dim}=======================================================${colors.reset}`);
        console.log(`🏠 ${colors.fg.yellow}LOCAL:${colors.reset}  http://localhost:${PORT}`);
        console.log(`🌐 ${colors.fg.yellow}RED:${colors.reset}    http://${localIP}:${PORT}`);
        if (tunnelUrl) console.log(`🌍 ${colors.fg.yellow}WEB:${colors.reset}    ${tunnelUrl}`);
        console.log(`${colors.dim}=======================================================\n${colors.reset}`);

        const s4 = new Spinner("Activando Servicios y Motor IA...");
        s4.start();
        initTools(messageService as any);
        initTelegramBot(messageService as any, reminderService, messageService as any);
        Scheduler.init(messageService as any, reminderService);
        BackupService.initScheduledBackup();
        s4.succeed("Telegram, Programadores y Herramientas listos.");

        const s5 = new Spinner("Conectando Motor de WhatsApp...");
        s5.start();
        await bot.start();
        s5.succeed("Motor Baileys Activo y Escuchando.");

        // Notificar a los administradores
        const finalUrl = tunnelUrl || `http://${localIP}:${PORT}`;
        await NotificationService.notifyAdmin(
            `🚀 *¡Sistema Online!*\n\n` +
            `El servidor de *${brand}* ha iniciado correctamente.\n\n` +
            `🔗 *Dashboard:* ${finalUrl}\n` +
            `📅 *Fecha:* ${new Date().toLocaleString('es-MX')}\n` +
            `🛡️ *Estado:* Operativo`
        );
    });
}

bootstrap().catch(err => {
    console.error("\n[FATAL] ERROR CRÍTICO DURANTE EL ARRANQUE:");
    console.error(err);
    process.exit(1);
});

// Manejo de apagado seguro (Graceful Shutdown)
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[SYSTEM] Recibida señal ${signal}. Iniciando apagado seguro...`);
    
    try {
        const brand = process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe';
        await NotificationService.notifyAdmin(
            `⚠️ *¡Alerta de Sistema!*\n\n` +
            `El servidor de *${brand}* se está apagando o reiniciando.\n\n` +
            `🛑 *Estado:* Offline\n` +
            `📅 *Fecha:* ${new Date().toLocaleString('es-MX')}`
        );
        console.log(`[SYSTEM] Notificación de apagado enviada por Telegram.`);
    } catch (e) {
        console.error("[SYSTEM] Error enviando notificación de apagado:", e);
    }

    try {
        const tunnel = TunnelService.getInstance();
        if (tunnel) await tunnel.stop();
    } catch(e) {}

    try {
        await bot.getSocketAdapter()?.disconnect();
        console.log(`[SYSTEM] Cliente de WhatsApp desconectado limpiamente.`);
    } catch(e) {}

    setTimeout(() => {
        console.log(`[SYSTEM] Apagado completado. Adios.`);
        process.exit(0);
    }, 1500); // Dar 1.5s extra a Baileys para guardar la sesión

}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
