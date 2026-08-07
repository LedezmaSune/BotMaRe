import rateLimit from 'express-rate-limit';

/**
 * Límite global para la API.
 * Evita abuso general o ataques DDoS básicos.
 * Configurable por variable de entorno RATE_LIMIT_MAX (por defecto 300 peticiones / 15 minutos).
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 300,
    message: { success: false, error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // En entorno local de desarrollo omitir rate limit si se especifica
        return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
    }
});

