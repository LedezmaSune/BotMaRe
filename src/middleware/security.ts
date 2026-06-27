import rateLimit from 'express-rate-limit';

/**
 * Límite global para la API.
 * Evita abuso general o ataques DDoS básicos.
 * 300 peticiones por cada 10 minutos.
 */
export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100000, // Límite absurdamente alto para que nunca bloquee al usuario localmente
    message: { success: false, error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
