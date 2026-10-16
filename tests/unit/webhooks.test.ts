import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { requireWebhookAuth, verifyGitHubSignature } from '../../src/routes/webhooks.routes';

describe('FASE 2: Webhooks y Autenticación Segura', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    describe('verifyGitHubSignature', () => {
        it('debe responder 503 si GITHUB_WEBHOOK_SECRET no está configurada', () => {
            delete process.env.GITHUB_WEBHOOK_SECRET;

            const req: any = {
                headers: { 'x-hub-signature-256': 'sha256=1234567890abcdef' },
                body: { action: 'ping' }
            };

            const result = verifyGitHubSignature(req);
            expect(result.valid).toBe(false);
            expect(result.status).toBe(503);
            expect(result.error).toContain('GITHUB_WEBHOOK_SECRET no configurada');
        });

        it('debe responder 401 si no se envía la cabecera x-hub-signature-256', () => {
            process.env.GITHUB_WEBHOOK_SECRET = 'super_secret_webhook_key';

            const req: any = {
                headers: {},
                body: { action: 'ping' }
            };

            const result = verifyGitHubSignature(req);
            expect(result.valid).toBe(false);
            expect(result.status).toBe(401);
            expect(result.error).toContain('Firma de webhook faltante');
        });

        it('debe responder 401 si la firma no coincide', () => {
            process.env.GITHUB_WEBHOOK_SECRET = 'super_secret_webhook_key';

            const req: any = {
                headers: { 'x-hub-signature-256': 'sha256=invaliddigestimpossibletoverifysomething' },
                rawBody: Buffer.from('{"action":"ping"}'),
                body: { action: 'ping' }
            };

            const result = verifyGitHubSignature(req);
            expect(result.valid).toBe(false);
            expect(result.status).toBe(401);
            expect(result.error).toContain('Firma de webhook inválida');
        });

        it('debe retornar valid = true si la firma coincide calculada sobre el cuerpo crudo (rawBody)', () => {
            const secret = 'mi_secreto_de_github_123';
            process.env.GITHUB_WEBHOOK_SECRET = secret;

            const rawBody = Buffer.from(JSON.stringify({ ref: 'refs/heads/main', commits: [] }));
            const hmac = crypto.createHmac('sha256', secret);
            const validSignature = 'sha256=' + hmac.update(rawBody).digest('hex');

            const req: any = {
                headers: { 'x-hub-signature-256': validSignature },
                rawBody: rawBody,
                body: { ref: 'refs/heads/main', commits: [] }
            };

            const result = verifyGitHubSignature(req);
            expect(result.valid).toBe(true);
            expect(result.status).toBeUndefined();
        });
    });

    describe('requireWebhookAuth', () => {
        it('debe responder 503 si WEBHOOK_API_KEY no está configurada', () => {
            delete process.env.WEBHOOK_API_KEY;

            let responseStatus = 0;
            let responseJson: any = null;

            const req: any = {
                headers: { 'x-api-key': 'alguna_clave' },
                ip: '127.0.0.1'
            };
            const res: any = {
                status: (code: number) => {
                    responseStatus = code;
                    return {
                        json: (data: any) => { responseJson = data; }
                    };
                }
            };
            const next = vi.fn();

            requireWebhookAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(responseStatus).toBe(503);
            expect(responseJson?.error).toContain('WEBHOOK_API_KEY no configurada');
        });

        it('debe responder 401 si falta la clave en las cabeceras', () => {
            process.env.WEBHOOK_API_KEY = 'clave_correcta_webhook_88';

            let responseStatus = 0;
            let responseJson: any = null;

            const req: any = {
                headers: {},
                ip: '127.0.0.1'
            };
            const res: any = {
                status: (code: number) => {
                    responseStatus = code;
                    return {
                        json: (data: any) => { responseJson = data; }
                    };
                }
            };
            const next = vi.fn();

            requireWebhookAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(responseStatus).toBe(401);
            expect(responseJson?.error).toContain('Se requiere cabecera x-api-key o Bearer token');
        });

        it('NO debe aceptar la clave por query string (?apikey=...)', () => {
            process.env.WEBHOOK_API_KEY = 'clave_correcta_webhook_88';

            let responseStatus = 0;
            const req: any = {
                headers: {},
                query: { apikey: 'clave_correcta_webhook_88' },
                ip: '127.0.0.1'
            };
            const res: any = {
                status: (code: number) => {
                    responseStatus = code;
                    return { json: vi.fn() };
                }
            };
            const next = vi.fn();

            requireWebhookAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(responseStatus).toBe(401);
        });

        it('debe responder 401 si la clave es incorrecta', () => {
            process.env.WEBHOOK_API_KEY = 'clave_correcta_webhook_88';

            let responseStatus = 0;
            const req: any = {
                headers: { 'x-api-key': 'clave_incorrecta_99' },
                ip: '127.0.0.1'
            };
            const res: any = {
                status: (code: number) => {
                    responseStatus = code;
                    return { json: vi.fn() };
                }
            };
            const next = vi.fn();

            requireWebhookAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(responseStatus).toBe(401);
        });

        it('debe autorizar exitosamente con cabecera x-api-key válida', () => {
            process.env.WEBHOOK_API_KEY = 'clave_correcta_webhook_88';

            const req: any = {
                headers: { 'x-api-key': 'clave_correcta_webhook_88' },
                ip: '127.0.0.1'
            };
            const res: any = {};
            const next = vi.fn();

            requireWebhookAuth(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('debe autorizar exitosamente con cabecera Authorization: Bearer <key>', () => {
            process.env.WEBHOOK_API_KEY = 'clave_correcta_webhook_88';

            const req: any = {
                headers: { authorization: 'Bearer clave_correcta_webhook_88' },
                ip: '127.0.0.1'
            };
            const res: any = {};
            const next = vi.fn();

            requireWebhookAuth(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });
});
