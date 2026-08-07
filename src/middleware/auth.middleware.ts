import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface LoginAttempt {
    count: number;
    blockedUntil: number | null;
}

// Almacenamiento en memoria de los intentos fallidos por IP
const failedAttempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

// Limpieza periódica de IPs para evitar fugas de memoria por rotación masiva de IP
setInterval(() => {
    const now = Date.now();
    for (const [ip, attempt] of failedAttempts.entries()) {
        if (attempt.blockedUntil && attempt.blockedUntil <= now) {
            failedAttempts.delete(ip);
        }
    }
}, 10 * 60 * 1000).unref();

/**
 * Comparación segura contra ataques de tiempos (Timing Attacks)
 */
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Valida credenciales contra las variables de entorno o valores por defecto
 */
export const validateCredentials = (user?: string, pass?: string): boolean => {
    if (!user || !pass) return false;
    const expectedUser = process.env.DASHBOARD_USER || 'admin';
    const expectedPass = process.env.DASHBOARD_PASS || 'admin123';
    return safeCompare(user, expectedUser) && safeCompare(pass, expectedPass);
};

/**
 * Middleware para autenticación básica del Dashboard con protección Anti-Fuerza Bruta
 */
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
    // No aplicar a rutas de WebSockets (se maneja en la capa de Socket.io)
    if (req.path.startsWith('/socket.io')) {
        return next();
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // 1. Verificar si la IP está bloqueada
    const attempt = failedAttempts.get(clientIp);
    if (attempt && attempt.blockedUntil && attempt.blockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attempt.blockedUntil - Date.now()) / 60000);
        return res.status(429).send(`Too Many Requests. Tu IP ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en ${remainingMinutes} minutos.`);
    } else if (attempt && attempt.blockedUntil && attempt.blockedUntil <= Date.now()) {
        // Desbloquear si el tiempo ya pasó
        failedAttempts.delete(clientIp);
    }

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    // 2. Validar credenciales con comparación constante en tiempo
    if (validateCredentials(login, password)) {
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


