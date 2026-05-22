import { Request, Response, NextFunction } from 'express';

interface LoginAttempt {
    count: number;
    blockedUntil: number | null;
}

// Almacenamiento en memoria de los intentos fallidos por IP
const failedAttempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Middleware para autenticación básica del Dashboard con protección Anti-Fuerza Bruta
 */
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
    // No aplicar a rutas de WebSockets (se maneja en el gateway)
    if (req.path.startsWith('/socket.io')) {
        return next();
    }

    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    
    // 1. Verificar si la IP está bloqueada
    const attempt = failedAttempts.get(clientIp);
    if (attempt && attempt.blockedUntil && attempt.blockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attempt.blockedUntil - Date.now()) / 60000);
        return res.status(429).send(`Too Many Requests. Tu IP ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en ${remainingMinutes} minutos.`);
    } else if (attempt && attempt.blockedUntil && attempt.blockedUntil <= Date.now()) {
        // Desbloquear si el tiempo ya pasó
        failedAttempts.delete(clientIp);
    }

    const auth = { 
        login: process.env.DASHBOARD_USER || 'admin', 
        password: process.env.DASHBOARD_PASS || 'admin123' 
    };
    
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    // 2. Validar credenciales
    if (login && password && login === auth.login && password === auth.password) {
        // Acceso concedido: resetear intentos
        failedAttempts.delete(clientIp);
        return next();
    }

    // 3. Fallo en autenticación
    if (b64auth) {
        const currentAttempt = failedAttempts.get(clientIp) || { count: 0, blockedUntil: null };
        currentAttempt.count += 1;

        if (currentAttempt.count >= MAX_ATTEMPTS) {
            currentAttempt.blockedUntil = Date.now() + BLOCK_DURATION_MS;
            console.warn(`[Security] 🚨 IP BLOQUEADA (${clientIp}) - Demasiados intentos fallidos.`);
        } else {
            console.warn(`[Security] ⚠️ Intento de acceso fallido desde ${clientIp} - Usuario: ${login} (Intento ${currentAttempt.count}/${MAX_ATTEMPTS})`);
        }
        
        failedAttempts.set(clientIp, currentAttempt);
    }

    res.set('WWW-Authenticate', `Basic realm="${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe'} Dashboard"`);
    res.status(401).send('Authentication required.');
};

