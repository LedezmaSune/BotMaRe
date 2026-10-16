import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import http from 'http';
import { basicAuth } from '../../src/middleware/auth.middleware';
import { shouldSkipRateLimit } from '../../src/middleware/security';

describe('FASE 5: Endurecimiento de la Superficie HTTP', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.DASHBOARD_USER = 'admin';
        process.env.DASHBOARD_PASS = 'secret123';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    describe('basicAuth Middleware y Exenciones', () => {
        it('debe permitir /healthz sin requerir credenciales', () => {
            const req: any = { path: '/healthz', headers: {}, socket: { remoteAddress: '127.0.0.1' } };
            const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn(), set: vi.fn() };
            const next = vi.fn();

            basicAuth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('debe permitir /socket.io sin requerir credenciales Basic Auth', () => {
            const req: any = { path: '/socket.io/?EIO=4&transport=polling', headers: {}, socket: { remoteAddress: '127.0.0.1' } };
            const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn(), set: vi.fn() };
            const next = vi.fn();

            basicAuth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('debe permitir webhooks autorizados sin requerir Basic Auth', () => {
            for (const webhookPath of ['/api/webhooks/github', '/api/webhooks/status', '/api/webhooks/incoming']) {
                const req: any = { path: webhookPath, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
                const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn(), set: vi.fn() };
                const next = vi.fn();

                basicAuth(req, res, next);

                expect(next).toHaveBeenCalled();
                expect(res.status).not.toHaveBeenCalled();
            }
        });

        it('debe devolver 401 si se accede a /index.html sin credenciales', () => {
            const req: any = { path: '/index.html', headers: {}, socket: { remoteAddress: '127.0.0.1' } };
            const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn(), set: vi.fn() };
            const next = vi.fn();

            basicAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.set).toHaveBeenCalledWith('WWW-Authenticate', expect.stringContaining('Basic realm='));
            expect(res.send).toHaveBeenCalledWith('Authentication required.');
        });

        it('debe devolver 401 si se accede a /api/settings sin credenciales', () => {
            const req: any = { path: '/api/settings', headers: {}, socket: { remoteAddress: '127.0.0.1' } };
            const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn(), set: vi.fn() };
            const next = vi.fn();

            basicAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('debe permitir acceso si se envían credenciales válidas', () => {
            const token = Buffer.from('admin:secret123').toString('base64');
            const req: any = {
                path: '/api/settings',
                headers: { authorization: `Basic ${token}` },
                socket: { remoteAddress: '127.0.0.1' }
            };
            const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn(), set: vi.fn() };
            const next = vi.fn();

            basicAuth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Rate Limiter Skip Logic', () => {
        it('debe aplicar rate limiting a loopback cuando no está en desarrollo (con X-Forwarded-For)', () => {
            (process.env as any).NODE_ENV = 'production';
            
            // En producción, skip debe ser falso (sí cuenta el rate limit)
            expect(shouldSkipRateLimit()).toBe(false);
        });

        it('solo omite rate limiting en entorno de desarrollo explícito', () => {
            (process.env as any).NODE_ENV = 'development';
            expect(shouldSkipRateLimit()).toBe(true);
        });
    });

    describe('End-to-End Pipeline HTTP (Acceptance Criteria)', () => {
        let app: express.Express;
        let server: http.Server;
        let baseUrl: string;

        beforeEach(async () => {
            (process.env as any).NODE_ENV = 'production';
            process.env.DASHBOARD_USER = 'testadmin';
            process.env.DASHBOARD_PASS = 'testpass';

            app = express();

            // 1. Endpoint público /healthz antes de basicAuth
            app.get('/healthz', (_req, res) => {
                res.status(200).json({
                    status: 'ok',
                    uptime: Math.floor(process.uptime()),
                    version: '2.7.0'
                });
            });

            // 2. basicAuth colocado antes de recursos estáticos y rutas
            app.use(basicAuth);

            // 3. Simulación de /index.html y /api/settings
            app.get('/index.html', (_req, res) => {
                res.status(200).send('<html><body>Dashboard</body></html>');
            });

            app.get('/api/settings', (_req, res) => {
                res.status(200).json({ success: true, settings: {} });
            });

            await new Promise<void>((resolve) => {
                server = app.listen(0, '127.0.0.1', () => {
                    const addr: any = server.address();
                    baseUrl = `http://127.0.0.1:${addr.port}`;
                    resolve();
                });
            });
        });

        afterEach(async () => {
            await new Promise<void>((resolve) => {
                if (server) server.close(() => resolve());
                else resolve();
            });
        });

        it('GET /healthz debe responder 200 sin credenciales', async () => {
            const res = await fetch(`${baseUrl}/healthz`);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.status).toBe('ok');
            expect(data.version).toBe('2.7.0');
            expect(typeof data.uptime).toBe('number');
        });

        it('GET /index.html sin credenciales debe responder 401', async () => {
            const res = await fetch(`${baseUrl}/index.html`);
            expect(res.status).toBe(401);
            expect(res.headers.get('www-authenticate')).toContain('Basic realm=');
        });

        it('GET /api/settings sin credenciales debe responder 401', async () => {
            const res = await fetch(`${baseUrl}/api/settings`);
            expect(res.status).toBe(401);
        });

        it('GET /index.html con credenciales válidas debe responder 200', async () => {
            const credentials = Buffer.from('testadmin:testpass').toString('base64');
            const res = await fetch(`${baseUrl}/index.html`, {
                headers: { Authorization: `Basic ${credentials}` }
            });
            expect(res.status).toBe(200);
            const text = await res.text();
            expect(text).toContain('Dashboard');
        });
    });
});
