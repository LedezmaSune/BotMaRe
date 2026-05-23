import rateLimit from 'express-rate-limit';

/**
 * Límite global para la API.
 * Evita abuso general o ataques DDoS básicos.
 * 300 peticiones por cada 10 minutos.
 */
export const globalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 3000, // Aumentado para desarrollo/uso local
    message: { success: false, error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
