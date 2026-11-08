import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecretProviderManager } from '../../src/core/secrets/provider';
import { SystemUtils } from '../../src/core/system';
import child_process from 'child_process';
import fs from 'fs';

describe('FASE 2 & 5: SecretProviderManager (1Password, dotenv, environment)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
        // Reset singleton provider state
        const manager = SecretProviderManager.getInstance();
        manager.setProvider('dotenv');
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    describe('1. Detección y Selección de Proveedor', () => {
        it('debe seleccionar "dotenv" por defecto si no hay variable explícita', () => {
            delete process.env.BOTMARE_SECRET_PROVIDER;
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('dotenv');
            expect(manager.getProvider()).toBe('dotenv');
        });

        it('debe permitir cambiar de proveedor explícitamente a 1password y environment', () => {
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('1password');
            expect(manager.getProvider()).toBe('1password');

            manager.setProvider('environment');
            expect(manager.getProvider()).toBe('environment');
        });
    });

    describe('2. Proveedor "environment"', () => {
        it('debe inicializar correctamente sin requerir archivo .env físico', () => {
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('environment');
            expect(() => manager.initialize()).not.toThrow();
        });
    });

    describe('3. Proveedor "1password" y Regla Anti-Fallback Silencioso', () => {
        it('debe fallar con error fatal si 1Password CLI ("op") no está instalado', () => {
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('1password');

            // Simular ausencia de 'op' CLI
            vi.spyOn(manager, 'isOpCliAvailable').mockReturnValue(false);

            expect(() => manager.initialize()).toThrow(/1Password CLI \('op'\) no se encuentra instalado/);
        });

        it('PROHIBIDO FALLBACK SILENCIOSO: Si 1Password falla, no debe caer a dotenv ni continuar', () => {
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('1password');
            vi.spyOn(manager, 'isOpCliAvailable').mockReturnValue(false);

            let threwError = false;
            try {
                manager.initialize();
            } catch (err: any) {
                threwError = true;
                expect(err.message).toContain('1Password CLI');
            }

            expect(threwError).toBe(true);
            // El proveedor debe permanecer como '1password' con error, sin cambiar silenciosamente a 'dotenv'
            expect(manager.getProvider()).toBe('1password');
        });

        it('debe lanzar error fatal si quedan referencias "op://" sin resolver en process.env', () => {
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('1password');
            vi.spyOn(manager, 'isOpCliAvailable').mockReturnValue(true);

            // Simular variable con referencia op:// no resuelta
            process.env.DASHBOARD_PASS = 'op://BotMaRe/dashboard/password';

            expect(() => manager.initialize()).toThrow(/referencias de 1Password sin resolver/);
        });

        it('debe resolver referencias en memoria mediante "op inject" si existe plantilla', () => {
            const manager = SecretProviderManager.getInstance();
            manager.setProvider('1password');
            vi.spyOn(manager, 'isOpCliAvailable').mockReturnValue(true);

            // Simular template .env.op
            vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
                if (String(p).includes('.env.op')) return true;
                return false;
            });
            vi.spyOn(fs, 'readFileSync').mockImplementation((p: any) => {
                if (String(p).includes('.env.op')) {
                    return 'DASHBOARD_PASS=op://BotMaRe/dashboard/password\n';
                }
                return '';
            });

            // Simular salida exitosa de 'op inject'
            vi.spyOn(child_process, 'execSync').mockReturnValue(
                Buffer.from('DASHBOARD_PASS=clave_resuelta_desde_1p_boveda\n')
            );

            delete process.env.DASHBOARD_PASS;
            manager.initialize();

            expect(process.env.DASHBOARD_PASS).toBe('clave_resuelta_desde_1p_boveda');
        });
    });

    describe('4. Validación Estricta en SystemUtils.validateEnv()', () => {
        it('debe rechazar referencias "op://" no resueltas como variables faltantes/inválidas', () => {
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
                throw new Error('process.exit(1) called');
            }) as any);
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            process.env.DASHBOARD_USER = 'admin';
            process.env.DASHBOARD_PASS = 'op://BotMaRe/dashboard/password'; // No resuelta!
            process.env.SUPERADMIN_KEY = 'super_secret_key_123';
            process.env.WEBHOOK_API_KEY = 'webhook_key_123';
            process.env.BACKUP_ENCRYPTION_KEY = 'backup_key_123';

            expect(() => SystemUtils.validateEnv()).toThrow('process.exit(1) called');
            expect(exitSpy).toHaveBeenCalledWith(1);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('5. Redacción de Logs y Prevención de Exposición (DevSecOps)', () => {
        it('debe sanitizar tokens de servicio (ops_...) en mensajes de error', () => {
            const manager = SecretProviderManager.getInstance();
            const leaked = 'Error connecting with token ops_abcdef1234567890abcdef1234567890 to vault';
            const clean = manager.sanitizeErrorMessage(leaked);

            expect(clean).not.toContain('ops_abcdef1234567890');
            expect(clean).toContain('[REDACTED_OP_TOKEN]');
        });

        it('debe anonimizar referencias completas op:// en mensajes de error', () => {
            const manager = SecretProviderManager.getInstance();
            const leaked = 'Failed resolving op://VaultPersonal/SuperSecretItem/password on server';
            const clean = manager.sanitizeErrorMessage(leaked);

            expect(clean).not.toContain('SuperSecretItem');
            expect(clean).toContain('op://');
        });

        it('checkHealth() nunca debe incluir valores de contraseñas o claves en el resultado', () => {
            process.env.DASHBOARD_PASS = 'mi_contrasena_ultra_secreta_999';
            process.env.SUPERADMIN_KEY = 'superadmin_super_clave_privada_888';

            const manager = SecretProviderManager.getInstance();
            const health = manager.checkHealth();

            const healthJson = JSON.stringify(health);
            expect(healthJson).not.toContain('mi_contrasena_ultra_secreta_999');
            expect(healthJson).not.toContain('superadmin_super_clave_privada_888');
        });

        it('getSecretReferencesInfo() debe reportar estado de variables sin exponer valores reales', () => {
            process.env.DASHBOARD_USER = 'admin';
            process.env.DASHBOARD_PASS = 'password_real_123';

            const manager = SecretProviderManager.getInstance();
            const refs = manager.getSecretReferencesInfo();

            const refsJson = JSON.stringify(refs);
            expect(refsJson).not.toContain('password_real_123');
            
            const passInfo = refs.find(r => r.key === 'DASHBOARD_PASS');
            expect(passInfo).toBeDefined();
            expect(passInfo?.isSet).toBe(true);
        });
    });
});

