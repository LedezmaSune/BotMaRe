import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export class AppError extends Error {
    constructor(public message: string, public statusCode: number = 500, public isOperational: boolean = true) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

    // Log the error using the new logger
    if (statusCode >= 500) {
        logger.error({ err, correlationId }, `[Error] ${statusCode} - ${message}`);
    } else {
        logger.warn({ correlationId }, `[Warning] ${statusCode} - ${message}`);
    }

    // Set correlation ID in response header
    res.setHeader('X-Correlation-ID', correlationId as string);

    // Build standard error response
    const errorResponse: any = {
        success: false,
        error: {
            message,
            correlationId
        }
    };

    // Include detailed validation errors if present (e.g., from Mongoose or custom validators)
    if (err.errors || err.name === 'ValidationError') {
        errorResponse.error.details = err.errors || err.message;
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
