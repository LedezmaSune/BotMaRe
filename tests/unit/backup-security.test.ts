import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { BackupService, encryptFile, decryptFile } from '../../src/modules/system/backup.service';

describe('FASE 7: Respaldo, Cifrado AES-256-GCM y Restauración Segura', () => {
    const originalEnv = { ...process.env };
    const scratchDir = path.resolve(process.cwd(), 'backups', 'test_scratch');

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.BACKUP_ENCRYPTION_KEY = 'super_secure_backup_encryption_key_2026';
        if (!fs.existsSync(scratchDir)) {
            fs.mkdirSync(scratchDir, { recursive: true });
        }
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        if (fs.existsSync(scratchDir)) {
            fs.rmSync(scratchDir, { recursive: true, force: true });
        }
        vi.restoreAllMocks();
    });

    describe('isPathRestorable (Allowlist de Rutas Restaurables)', () => {
        it('debe permitir bases de datos y carpetas autorizadas', () => {
            expect(BackupService.isPathRestorable('data/database.db')).toBe(true);
            expect(BackupService.isPathRestorable('data/database.json')).toBe(true);
            expect(BackupService.isPathRestorable('data/whatsapp_auth.db')).toBe(true);
            expect(BackupService.isPathRestorable('data/uploads/image.png')).toBe(true);
            expect(BackupService.isPathRestorable('data/uploads/subfolder/file.pdf')).toBe(true);
            expect(BackupService.isPathRestorable('data/templates/main.json')).toBe(true);
        });

        it('debe RECHAZAR estrictamente plugins, .env, auth_info_baileys y path traversal', () => {
            // Plugins (código ejecutable)
            expect(BackupService.isPathRestorable('data/plugins/pwn.js')).toBe(false);
            expect(BackupService.isPathRestorable('data/plugins/evil.ts')).toBe(false);

            // Variables de entorno
            expect(BackupService.isPathRestorable('.env')).toBe(false);
            expect(BackupService.isPathRestorable('data/.env')).toBe(false);
            expect(BackupService.isPathRestorable('data/sub/.env')).toBe(false);

            // Credenciales WhatsApp Baileys
            expect(BackupService.isPathRestorable('auth_info_baileys/creds.json')).toBe(false);
            expect(BackupService.isPathRestorable('auth_info_baileys/app-state-sync-key.json')).toBe(false);

            // Path Traversal
            expect(BackupService.isPathRestorable('../../../etc/passwd')).toBe(false);
            expect(BackupService.isPathRestorable('..\\..\\windows\\system32')).toBe(false);
            expect(BackupService.isPathRestorable('data/uploads/../../evil.js')).toBe(false);

            // Archivos de sistema o raíz
            expect(BackupService.isPathRestorable('package.json')).toBe(false);
            expect(BackupService.isPathRestorable('server.js')).toBe(false);
        });
    });

    describe('Cifrado y Descifrado con AES-256-GCM y Salt Aleatorio', () => {
        it('debe cifrar y descifrar un archivo conservando integridad perfecta', () => {
            const testFile = path.join(scratchDir, 'original.txt');
            const encFile = path.join(scratchDir, 'encrypted.enc');
            const decFile = path.join(scratchDir, 'decrypted.txt');

            fs.writeFileSync(testFile, 'Contenido ultra secreto del bot para respaldo');

            encryptFile(testFile, encFile);
            expect(fs.existsSync(encFile)).toBe(true);

            decryptFile(encFile, decFile);
            expect(fs.readFileSync(decFile, 'utf8')).toBe('Contenido ultra secreto del bot para respaldo');
        });

        it('debe fallar si la clave de cifrado es incorrecta', () => {
            const testFile = path.join(scratchDir, 'original.txt');
            const encFile = path.join(scratchDir, 'encrypted.enc');
            const decFile = path.join(scratchDir, 'decrypted.txt');

            fs.writeFileSync(testFile, 'Texto de prueba');
            encryptFile(testFile, encFile);

            // Cambiar la clave para el descifrado
            process.env.BACKUP_ENCRYPTION_KEY = 'wrong_password_key_123';
            expect(() => decryptFile(encFile, decFile)).toThrow(/clave de desencriptado es incorrecta/i);
        });

        it('debe fallar por tag de autenticación GCM si el ciphertext fue alterado', () => {
            const testFile = path.join(scratchDir, 'original.txt');
            const encFile = path.join(scratchDir, 'encrypted.enc');
            const decFile = path.join(scratchDir, 'decrypted.txt');

            fs.writeFileSync(testFile, 'Texto con integridad asegurada por GCM');
            encryptFile(testFile, encFile);

            // Alterar un byte del archivo cifrado
            const buf = fs.readFileSync(encFile);
            buf[buf.length - 1] ^= 0xff; // Invertir bits del último byte
            fs.writeFileSync(encFile, buf);

            expect(() => decryptFile(encFile, decFile)).toThrow(/integridad del archivo ha sido alterada/i);
        });
    });

    describe('restoreBackup - Criterios de Aceptación', () => {
        it('debe rechazar un archivo de respaldo sin cifrar (.zip sin .enc)', async () => {
            const unencryptedZip = path.join(scratchDir, 'plain-backup.zip');
            const zip = new AdmZip();
            zip.addFile('data/database.db', Buffer.from('dummy db'));
            zip.writeZip(unencryptedZip);

            const result = await BackupService.restoreBackup(unencryptedZip);
            expect(result.success).toBe(false);
            expect(result.message).toContain('el archivo no está cifrado');
        });

        it('debe rechazar un respaldo cifrado que contenga data/plugins/pwn.js sin escribir nada', async () => {
            const maliciousZip = path.join(scratchDir, 'malicious.zip');
            const encryptedMalicious = path.join(scratchDir, 'malicious.zip.enc');

            const zip = new AdmZip();
            zip.addFile('data/database.db', Buffer.from('db content'));
            zip.addFile('data/plugins/pwn.js', Buffer.from('console.log("PWNED")'));
            zip.writeZip(maliciousZip);

            encryptFile(maliciousZip, encryptedMalicious);

            // Intentar restaurar
            const result = await BackupService.restoreBackup(encryptedMalicious);

            expect(result.success).toBe(false);
            expect(result.message).toContain('rutas no autorizadas o potencialmente peligrosas');
            expect(result.message).toContain('data/plugins/pwn.js');

            // Verificar que no se escribió ningún plugin
            const targetPwnPath = path.resolve(process.cwd(), 'data', 'plugins', 'pwn.js');
            expect(fs.existsSync(targetPwnPath)).toBe(false);
        });

        it('debe rechazar un respaldo que contenga archivo .env', async () => {
            const envZip = path.join(scratchDir, 'contains_env.zip');
            const encEnvZip = path.join(scratchDir, 'contains_env.zip.enc');

            const zip = new AdmZip();
            zip.addFile('.env', Buffer.from('MALICIOUS_ENV=1'));
            zip.writeZip(envZip);

            encryptFile(envZip, encEnvZip);

            const result = await BackupService.restoreBackup(encEnvZip);
            expect(result.success).toBe(false);
            expect(result.message).toContain('rutas no autorizadas o potencialmente peligrosas');
        });

        it('debe restaurar exitosamente un respaldo legítimo cifrado', async () => {
            const validZip = path.join(scratchDir, 'valid.zip');
            const validEncZip = path.join(scratchDir, 'valid.zip.enc');

            const zip = new AdmZip();
            zip.addFile('data/uploads/test_photo.jpg', Buffer.from('foto-dummy'));
            zip.writeZip(validZip);

            encryptFile(validZip, validEncZip);

            const result = await BackupService.restoreBackup(validEncZip);
            expect(result.success).toBe(true);

            // Verificar que se extrajo el archivo a uploads
            const restoredPhoto = path.resolve(process.cwd(), 'data', 'uploads', 'test_photo.jpg');
            expect(fs.existsSync(restoredPhoto)).toBe(true);

            // Limpieza del archivo restaurado
            fs.unlinkSync(restoredPhoto);
        });
    });
});
