import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const MAX_ARRAY_LENGTH = 100;

// Replacer para enmascarar datos sensibles y acortar arrays grandes
const replacer = (key: string, value: any) => {
    if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
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
        } else {
            logger.info(logMessage);
        }

        // Si hay cuerpo de petición y queremos loguearlo en modo verbose/debug
        if (req.body && Object.keys(req.body).length > 0) {
            logger.debug(`Payload: ${JSON.stringify(req.body, replacer)}`);
        }
    });

    next();
};
