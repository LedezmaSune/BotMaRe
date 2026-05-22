import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { globalLimiter } from './middleware/security';

// Core & Infrastructure
import { Bot } from './core/bot';
import { SystemUtils } from './core/system';
import { TunnelService } from './core/tunnel';
import { NotificationService } from './telegram/notification.service';

// Components
import { createMainRouter } from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { basicAuth } from './middleware/auth.middleware';
import { Scheduler } from './modules/scheduling/scheduler';
import { ReminderService } from './modules/reminders/reminder.service';
import { initTelegramBot } from './telegram/bot';
import { initTools } from './tools/index';
import { BackupService } from './modules/system/backup.service';

dotenv.config();

// Prevenir caídas del servidor por excepciones no controladas o promesas rechazadas (p.ej. fallos en Baileys/Signal)
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
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:", "http://localhost:*", "https://*"], 
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Limitador de Peticiones Global
app.use('/api', globalLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- NUEVA ARQUITECTURA MODULAR ---
const bot = new Bot(io);
const messageService = bot.getMessageService();
const reminderService = new ReminderService();

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
            const potentialHtmlPath = path.join(frontendPath, req.path === '/' ? 'index.html' : `${req.path}.html`);
            
            if (fs.existsSync(potentialHtmlPath)) {
                return res.sendFile(potentialHtmlPath);
            }

            // Fallback a index.html para rutas no encontradas (SPA mode)
            const indexPath = path.join(frontendPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).send('Dashboard files not found in: ' + frontendPath);
            }
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
    console.log(`\n[Fase 0] Validando Entorno...`);
    try {
        SystemUtils.ensureDirs();
        SystemUtils.validateEnv();
        console.log(`  ✓ Carpetas del sistema y .env validados.`);
    } catch (e: any) {
        console.error(`  [!] Error de validación: ${e.message}`);
        process.exit(1);
    }

    console.log(`[Fase 1] Inicializando Almacenamiento y Memoria...`);
    console.log(`  ✓ SQLite y Caché de Memoria listos.`);

    console.log(`[Fase 2] Conectividad y Acceso Global...`);
    const tunnel = TunnelService.getInstance();
    let tunnelUrl = null;
    try {
        tunnelUrl = await tunnel.start(Number(PORT));
        if (tunnelUrl) console.log(`  🌍 TÚNEL: ${tunnelUrl}`);
    } catch (e) {
        console.log(`  [!] No se pudo establecer el túnel. Solo acceso local.`);
    }

    console.log(`[Fase 3] Desplegando Servidor y Dashboard...`);
    server.listen(Number(PORT), '0.0.0.0', async () => {
        const localIP = SystemUtils.getLocalIP();
        
        console.log(`\n=======================================================`);
        const brand = process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe';
        console.log(`🦊 MOTOR ${brand.toUpperCase()} ACTIVADO`);
        console.log(`=======================================================`);
        console.log(`🏠 LOCAL:  http://localhost:${PORT}`);
        console.log(`🌐 RED:    http://${localIP}:${PORT}`);
        if (tunnelUrl) console.log(`🌍 WEB:    ${tunnelUrl}`);
        console.log(`=======================================================\n`);

        console.log(`[Fase 4] Activando Servicios e IA...`);
        initTools(messageService as any);
        initTelegramBot(messageService as any, reminderService, messageService as any);
        Scheduler.init(messageService as any, reminderService);
        BackupService.initScheduledBackup();
        console.log(`  ✓ Telegram, Programadores y Herramientas listos.`);

        console.log(`\n[Fase 5] Conectando Motor de WhatsApp...`);
        await bot.start();

        // Notificar a los administradores que el sistema está listo
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
