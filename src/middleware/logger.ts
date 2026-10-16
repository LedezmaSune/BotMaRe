import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const MAX_ARRAY_LENGTH = 100;

// Patrones para identificar claves que contienen secretos o credenciales
const SENSITIVE_LOG_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /pass/i,
    /masterkey/i,
    /refreshtoken/i,
    /private[_-]?key/i,
    /authorization/i
];

// Replacer para enmascarar datos sensibles y acortar arrays grandes
export const maskSensitiveLog = (key: string, value: any) => {
    if (key && SENSITIVE_LOG_PATTERNS.some(pattern => pattern.test(key))) {
        return '********';
    }

    if (Array.isArray(value) && value.length > MAX_ARRAY_LENGTH) {
        return [...value.slice(0, MAX_ARRAY_LENGTH), `...and ${value.length - MAX_ARRAY_LENGTH} more`];
    }

    return value;
};

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const { method, url, ip } = req;

    // Escuchar cuando la respuesta termine para registrar el tiempo y código de estado
    res.on('finish', () => {
        const finish = performance.now();
        const duration = (finish - start).toFixed(2);
        const { statusCode } = res;

        const logMessage = `${method} ${url} ${statusCode} ${duration}ms - IP: ${ip}`;

        if (statusCode >= 500) {
            logger.error(logMessage);
        } else if (statusCode >= 400) {
            logger.warn(logMessage);
        } else if (method !== 'GET') { // Solo loguear peticiones que no sean GET (como POST, PUT, DELETE) para evitar spam de polling
            logger.info(logMessage);
        }

        // Si es la ruta de parse-env, jamás loguear el cuerpo (.env entero)
        const isParseEnv = (req.path && req.path.includes('parse-env')) || (url && url.includes('parse-env'));

        if (isParseEnv) {
            logger.debug('Payload: [REDACTED .env CONTENT]');
        } else if (req.body && Object.keys(req.body).length > 0) {
            logger.debug(`Payload: ${JSON.stringify(req.body, maskSensitiveLog)}`);
        }
    });

    next();
};
