import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRequiredSecret, generateSecret } from '../../src/core/secrets';
import { validateCredentials } from '../../src/middleware/auth.middleware';
import { LicensingService } from '../../src/core/licensing.service';
import { SystemUtils } from '../../src/core/system';

describe('FASE 1: Secretos, Credenciales y Fallbacks', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    describe('getRequiredSecret & generateSecret', () => {
        it('debe devolver el valor del secreto si está definido', () => {
            process.env.TEST_SECRET_KEY = 'mi_clave_secreta';
            expect(getRequiredSecret('TEST_SECRET_KEY')).toBe('mi_clave_secreta');
        });

        it('debe lanzar un error si la variable no existe o está vacía', () => {
            delete process.env.TEST_SECRET_KEY;
            expect(() => getRequiredSecret('TEST_SECRET_KEY')).toThrow('Secreto requerido no configurado: TEST_SECRET_KEY');

            process.env.TEST_SECRET_KEY = '   ';
            expect(() => getRequiredSecret('TEST_SECRET_KEY')).toThrow('Secreto requerido no configurado: TEST_SECRET_KEY');
        });

        it('debe generar un secreto aleatorio válido en base64url', () => {
            const secret = generateSecret(32);
            expect(secret).toBeDefined();
            expect(typeof secret).toBe('string');
            expect(secret.length).toBeGreaterThanOrEqual(40);
        });
    });

    describe('validateCredentials (Dashboard Auth)', () => {
        it('NO debe permitir admin / admin123 por defecto si las variables no coinciden o no existen', () => {
            delete process.env.DASHBOARD_USER;
            delete process.env.DASHBOARD_PASS;

            expect(validateCredentials('admin', 'admin123')).toBe(false);
        });

        it('debe fallar si falta DASHBOARD_PASS aunque el usuario coincida', () => {
            process.env.DASHBOARD_USER = 'admin';
            delete process.env.DASHBOARD_PASS;

            expect(validateCredentials('admin', 'admin123')).toBe(false);
        });

        it('debe autenticar correctamente solo con las credenciales explícitas', () => {
            process.env.DASHBOARD_USER = 'operador';
            process.env.DASHBOARD_PASS = 'claveSuperSegura123';

            expect(validateCredentials('operador', 'claveSuperSegura123')).toBe(true);
            expect(validateCredentials('operador', 'otraClave')).toBe(false);
            expect(validateCredentials('admin', 'claveSuperSegura123')).toBe(false);
        });
    });

    describe('LicensingService (SuperAdmin Master Key)', () => {
        const service = LicensingService.getInstance();

        it('debe indicar isMasterKeyConfigured = false y rechazar botmare_admin si SUPERADMIN_KEY no está configurada', () => {
            delete process.env.SUPERADMIN_KEY;

            expect(service.isMasterKeyConfigured()).toBe(false);
            expect(service.verifyMasterKey('botmare_admin')).toBe(false);
            expect(service.verifyMasterKey('')).toBe(false);
        });

        it('debe validar la clave solo si está configurada y coincide exactamente', () => {
            process.env.SUPERADMIN_KEY = 'master_super_key_99';

            expect(service.isMasterKeyConfigured()).toBe(true);
            expect(service.verifyMasterKey('master_super_key_99')).toBe(true);
            expect(service.verifyMasterKey('clave_incorrecta')).toBe(false);
            expect(service.verifyMasterKey('botmare_admin')).toBe(false);
        });
    });

    describe('SystemUtils.validateEnv', () => {
        it('debe abortar con process.exit(1) si falta alguna variable obligatoria', () => {
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
                throw new Error('process.exit(1) called');
            }) as any);
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            delete process.env.BACKUP_ENCRYPTION_KEY;

            expect(() => SystemUtils.validateEnv()).toThrow('process.exit(1) called');
            expect(exitSpy).toHaveBeenCalledWith(1);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('debe abortar si DASHBOARD_PASS contiene la contraseña por defecto de ejemplo', () => {
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
                throw new Error('process.exit(1) called');
            }) as any);
            vi.spyOn(console, 'error').mockImplementation(() => {});

            process.env.DASHBOARD_USER = 'admin';
            process.env.DASHBOARD_PASS = 'tu_contrasena_segura';
            process.env.WEBHOOK_API_KEY = 'key_123';
            process.env.SUPERADMIN_KEY = 'key_456';
            process.env.BACKUP_ENCRYPTION_KEY = 'key_789';

            expect(() => SystemUtils.validateEnv()).toThrow('process.exit(1) called');
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('debe pasar exitosamente si todas las variables requeridas están correctamente configuradas', () => {
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

            process.env.DASHBOARD_USER = 'admin';
            process.env.DASHBOARD_PASS = 'clave_real_segura_48572';
            process.env.WEBHOOK_API_KEY = 'wh_key_384729487';
            process.env.SUPERADMIN_KEY = 'admin_key_9384729384';
            process.env.BACKUP_ENCRYPTION_KEY = 'backup_key_293847293847';

            expect(() => SystemUtils.validateEnv()).not.toThrow();
            expect(exitSpy).not.toHaveBeenCalled();
        });
    });
});
