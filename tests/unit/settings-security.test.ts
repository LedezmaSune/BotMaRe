import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SettingsController, BLOCKED_SETTINGS_KEYS, WRITABLE_SETTINGS_KEYS } from '../../src/modules/settings/settings.controller';
import { getSafePublicConfig, isSensitiveKey, maskSecret } from '../../src/core/config';
import { maskSensitiveLog } from '../../src/middleware/logger';
import * as db from '../../src/core/db';

describe('FASE 6: Protección de Secretos, Logs y Configuración', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.DASHBOARD_USER = 'admin';
        process.env.DASHBOARD_PASS = 'adminSecretPassword987';
        process.env.SUPERADMIN_KEY = 'superSecretMasterKey123';
        process.env.GROQ_API_KEY = 'gsk_superSecretGroqKey1234';
        process.env.OPENAI_API_KEY = 'sk-proj-superSecretOpenAIKey5678';
        process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

        vi.spyOn(db, 'updateSettings').mockResolvedValue(undefined as any);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    describe('Enmascaramiento en Configuración Pública (getSafePublicConfig)', () => {
        it('debe detectar correctamente claves sensibles', () => {
            expect(isSensitiveKey('DASHBOARD_PASS')).toBe(true);
            expect(isSensitiveKey('SUPERADMIN_KEY')).toBe(true);
            expect(isSensitiveKey('BACKUP_ENCRYPTION_KEY')).toBe(true);
            expect(isSensitiveKey('GROQ_API_KEY')).toBe(true);
            expect(isSensitiveKey('GEMINI_API_KEY')).toBe(true);
            expect(isSensitiveKey('TELEGRAM_BOT_TOKEN')).toBe(true);
            expect(isSensitiveKey('HTTPSMS_API_KEY')).toBe(true);

            expect(isSensitiveKey('PORT')).toBe(false);
            expect(isSensitiveKey('GROQ_MODEL')).toBe(false);
            expect(isSensitiveKey('AI_ENABLED')).toBe(false);
        });

        it('maskSecret debe ocultar el secreto y dejar solo una máscara con los últimos 4 caracteres', () => {
            expect(maskSecret('adminSecretPassword987')).toBe('••••d987');
            expect(maskSecret('1234')).toBe('••••');
            expect(maskSecret('')).toBe('');
            expect(maskSecret(undefined)).toBe('');
        });

        it('GET /api/settings jamás debe devolver valores de secretos en claro', async () => {
            const publicConfig = await getSafePublicConfig();

            // Ninguna clave sensible debe contener el valor real
            expect(publicConfig.DASHBOARD_PASS).not.toBe('adminSecretPassword987');
            expect(publicConfig.DASHBOARD_PASS).toBe('••••d987');

            expect(publicConfig.GROQ_API_KEY).not.toBe('gsk_superSecretGroqKey1234');
            expect(publicConfig.GROQ_API_KEY).toBe('••••1234');

            expect(publicConfig.OPENAI_API_KEY).not.toBe('sk-proj-superSecretOpenAIKey5678');
            expect(publicConfig.OPENAI_API_KEY).toBe('••••5678');

            expect(publicConfig.TELEGRAM_BOT_TOKEN).not.toBe('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
            expect(publicConfig.TELEGRAM_BOT_TOKEN).toBe('••••ew11');
        });
    });

    describe('Validación y Allowlist en POST /api/settings', () => {
        const controller = new SettingsController();

        it('debe RECHAZAR peticiones que intenten modificar WHATSAPP_OWNER_NUMBER', async () => {
            const req: any = {
                body: {
                    WHATSAPP_OWNER_NUMBER: '5215512345678'
                }
            };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await controller.updateSettings(req, res, () => {});

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.stringContaining('WHATSAPP_OWNER_NUMBER')
            }));
        });

        it('debe RECHAZAR peticiones que intenten modificar DASHBOARD_PASS o SUPERADMIN_KEY', async () => {
            for (const key of ['DASHBOARD_USER', 'DASHBOARD_PASS', 'SUPERADMIN_KEY', 'BACKUP_ENCRYPTION_KEY']) {
                const req: any = { body: { [key]: 'hacked' } };
                const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };

                await controller.updateSettings(req, res, () => {});

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    success: false,
                    error: expect.stringContaining(key)
                }));
            }
        });

        it('debe aceptar claves permitidas en la allowlist', async () => {
            const req: any = {
                body: {
                    GROQ_MODEL: 'llama-3.3-70b-versatile',
                    AI_ENABLED: 'true'
                }
            };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            const next = vi.fn((err) => { if (err) console.error('UPDATE_SETTINGS NEXT ERROR:', err); });
            await controller.updateSettings(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('parse-env: Validación, Variables Obligatorias y Backup', () => {
        const controller = new SettingsController();
        const testEnvPath = path.resolve(process.cwd(), '.env');
        const testBackupPath = path.resolve(process.cwd(), '.env.backup');

        it('debe rechazar contenido si faltan variables obligatorias de seguridad', async () => {
            const invalidContent = `
PORT=8000
GROQ_API_KEY=gsk_test
`;
            const req: any = { body: { content: invalidContent } };
            const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };

            await controller.parseEnvFile(req, res, () => {});

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.stringContaining('Faltan variables obligatorias de seguridad')
            }));
        });

        it('debe rechazar contenido si no incluye ningún proveedor de IA', async () => {
            const noAiContent = `
DASHBOARD_USER=admin
DASHBOARD_PASS=testpass123
SUPERADMIN_KEY=supersecret123
WEBHOOK_API_KEY=webhookkey123
BACKUP_ENCRYPTION_KEY=backupkey123
PORT=8000
`;
            const req: any = { body: { content: noAiContent } };
            const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };

            await controller.parseEnvFile(req, res, () => {});

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.stringContaining('Debe configurar al menos un proveedor de IA')
            }));
        });

        it('debe crear copia de seguridad (.env.backup) y validar formato de líneas', async () => {
            // Guardar backup previo si existía
            const originalExisted = fs.existsSync(testEnvPath);
            const originalContent = originalExisted ? fs.readFileSync(testEnvPath, 'utf8') : null;

            try {
                fs.writeFileSync(testEnvPath, 'ORIGINAL_TEST_ENV=1\n', 'utf8');

                const validContent = `
# Comentario de prueba
DASHBOARD_USER=admin
DASHBOARD_PASS=validpass123
SUPERADMIN_KEY=supersecret123
WEBHOOK_API_KEY=webhookkey123
BACKUP_ENCRYPTION_KEY=backupkey123
GROQ_API_KEY=gsk_valid_key_1234
PORT=8000
`;
                const req: any = { body: { content: validContent } };
                const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
                const next = vi.fn((err) => { if (err) console.error('PARSE_ENV NEXT ERROR:', err); });

                await controller.parseEnvFile(req, res, next);

                expect(next).not.toHaveBeenCalled();
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    success: true,
                    message: expect.stringContaining('respaldado')
                }));

                // Debe haberse generado .env.backup con el contenido original
                expect(fs.existsSync(testBackupPath)).toBe(true);
                const backupText = fs.readFileSync(testBackupPath, 'utf8');
                expect(backupText).toContain('ORIGINAL_TEST_ENV=1');
            } finally {
                // Restaurar estado previo
                if (fs.existsSync(testBackupPath)) {
                    fs.unlinkSync(testBackupPath);
                }
                if (originalExisted && originalContent !== null) {
                    fs.writeFileSync(testEnvPath, originalContent, 'utf8');
                } else if (fs.existsSync(testEnvPath)) {
                    fs.unlinkSync(testEnvPath);
                }
            }
        });
    });

    describe('Enmascarado en Logs (maskSensitiveLog)', () => {
        it('debe enmascarar contraseñas, tokens y API keys', () => {
            expect(maskSensitiveLog('password', 'secret123')).toBe('********');
            expect(maskSensitiveLog('DASHBOARD_PASS', 'secret123')).toBe('********');
            expect(maskSensitiveLog('GROQ_API_KEY', 'gsk_12345')).toBe('********');
            expect(maskSensitiveLog('TELEGRAM_BOT_TOKEN', 'token_12345')).toBe('********');
            expect(maskSensitiveLog('masterKey', 'key_12345')).toBe('********');
            expect(maskSensitiveLog('refreshToken', 'token_12345')).toBe('********');
            expect(maskSensitiveLog('private_key', '-----BEGIN RSA PRIVATE KEY-----')).toBe('********');
            expect(maskSensitiveLog('authorization', 'Bearer 12345')).toBe('********');

            // No sensibles
            expect(maskSensitiveLog('GROQ_MODEL', 'llama-3.3-70b-versatile')).toBe('llama-3.3-70b-versatile');
            expect(maskSensitiveLog('PORT', 8000)).toBe(8000);
        });
    });
});
