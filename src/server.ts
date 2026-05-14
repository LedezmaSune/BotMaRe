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

// Core & Infrastructure
import { Bot } from './core/bot';
import { SystemUtils } from './core/system';
import { TunnelService } from './core/tunnel';

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

// 2. Limitador de Peticiones
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // Aún más permisivo
    message: 'Demasiadas peticiones.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

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

    console.log(`[Fase 3] Integración de IA y Herramientas...`);
    initTools(messageService as any);
    initTelegramBot(messageService as any, reminderService, messageService as any);
    Scheduler.init(messageService as any, reminderService);
    BackupService.initScheduledBackup();
    console.log(`  ✓ Herramientas de IA, Telegram y Programadores activos.`);

    console.log(`[Fase 4] Desplegando Motor y Servidor...`);
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
        
        console.log(`[Motor] Iniciando conexión con WhatsApp...`);
        await bot.start();
    });
}

bootstrap().catch(err => {
    console.error("\n[FATAL] ERROR CRÍTICO DURANTE EL ARRANQUE:");
    console.error(err);
    process.exit(1);
});
