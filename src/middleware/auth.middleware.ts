import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para autenticación básica del Dashboard
 */
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
    // No aplicar a rutas de WebSockets (se maneja en el gateway)
    if (req.path.startsWith('/socket.io')) {
        return next();
    }

    const auth = { 
        login: process.env.DASHBOARD_USER || 'admin', 
        password: process.env.DASHBOARD_PASS || 'admin123' 
    };
    
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (login && password && login === auth.login && password === auth.password) {
        // Opcional: Log de acceso exitoso (descomentar si se desea auditar cada acceso)
        // console.log(`[Security] Acceso concedido a ${login} desde ${clientIp}`);
        return next();
    }

    if (b64auth) {
        console.warn(`[Security] INTENTO DE ACCESO FALLIDO desde ${clientIp} - Usuario: ${login}`);
    }

    res.set('WWW-Authenticate', 'Basic realm="BotMaRe Dashboard"');
    res.status(401).send('Authentication required.');
};
