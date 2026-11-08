import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SecretMigrationService } from '../../src/core/secrets/migration';
import { SecretProviderManager } from '../../src/core/secrets/provider';

describe('SecretMigrationService - Migración de .env a 1Password', () => {
    const testDir = path.resolve(process.cwd(), 'tests/temp-migration-test');
    const testEnvPath = path.join(testDir, '.env');
    const testTemplatePath = path.join(testDir, '.env.op');

    beforeEach(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('debe detectar correctamente claves sensibles y no sensibles', () => {
        expect(SecretMigrationService.isSensitiveKey('DASHBOARD_PASS')).toBe(true);
        expect(SecretMigrationService.isSensitiveKey('SUPERADMIN_KEY')).toBe(true);
        expect(SecretMigrationService.isSensitiveKey('GROQ_API_KEY')).toBe(true);
        expect(SecretMigrationService.isSensitiveKey('TELEGRAM_BOT_TOKEN')).toBe(true);
        expect(SecretMigrationService.isSensitiveKey('CUSTOM_SECRET')).toBe(true);

        expect(SecretMigrationService.isSensitiveKey('PORT')).toBe(false);
        expect(SecretMigrationService.isSensitiveKey('NODE_ENV')).toBe(false);
        expect(SecretMigrationService.isSensitiveKey('AI_ENABLED')).toBe(false);
    });

    it('debe generar una plantilla .env.op mapeando variables a referencias op://', () => {
        const sampleEnv = [
            '# Configuración General',
            'PORT=8000',
            'DASHBOARD_USER=admin',
            'DASHBOARD_PASS="MiSuperPassword123"',
            'SUPERADMIN_KEY=SuperSecretMasterKey',
            'GROQ_API_KEY=gsk_test123456789',
            'TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI',
            'AI_ENABLED=true'
        ].join('\n');

        const { template, migratedKeys, itemsData } = SecretMigrationService.generateTemplate(sampleEnv, 'MiBoveda');

        expect(template).toContain('PORT=8000');
        expect(template).toContain('DASHBOARD_USER=admin');
        expect(template).toContain('DASHBOARD_PASS=op://MiBoveda/botmare-dashboard/password');
        expect(template).toContain('SUPERADMIN_KEY=op://MiBoveda/botmare-security/superadmin_key');
        expect(template).toContain('GROQ_API_KEY=op://MiBoveda/botmare-ai/groq_api_key');
        expect(template).toContain('TELEGRAM_BOT_TOKEN=op://MiBoveda/botmare-telegram/token');
        expect(template).toContain('AI_ENABLED=true');

        expect(migratedKeys).toContain('DASHBOARD_PASS');
        expect(migratedKeys).toContain('SUPERADMIN_KEY');
        expect(migratedKeys).toContain('GROQ_API_KEY');
        expect(migratedKeys).toContain('TELEGRAM_BOT_TOKEN');

        expect(itemsData['botmare-dashboard'].password).toBe('MiSuperPassword123');
        expect(itemsData['botmare-security'].superadmin_key).toBe('SuperSecretMasterKey');
        expect(itemsData['botmare-ai'].groq_api_key).toBe('gsk_test123456789');
    });

    it('debe ejecutar la migración, crear respaldo .env.backup y escribir .env.op', async () => {
        const sampleEnv = [
            'PORT=8001',
            'DASHBOARD_PASS=pass123',
            'GROQ_API_KEY=gsk_sample'
        ].join('\n');

        fs.writeFileSync(testEnvPath, sampleEnv, 'utf8');

        const result = await SecretMigrationService.migrate({
            vaultName: 'BotMaRe-Test',
            envPath: testEnvPath,
            templatePath: testTemplatePath,
            createInVault: false,
            activateProvider: true
        });

        expect(result.success).toBe(true);
        expect(result.vaultName).toBe('BotMaRe-Test');
        expect(result.migratedKeys).toHaveLength(2);
        expect(fs.existsSync(testTemplatePath)).toBe(true);
        expect(fs.existsSync(result.backupPath)).toBe(true);

        const opContent = fs.readFileSync(testTemplatePath, 'utf8');
        expect(opContent).toContain('op://BotMaRe-Test/botmare-dashboard/password');

        const updatedEnv = fs.readFileSync(testEnvPath, 'utf8');
        expect(updatedEnv).toContain('BOTMARE_SECRET_PROVIDER=1password');
    });
});

