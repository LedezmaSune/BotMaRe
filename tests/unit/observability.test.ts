import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileCleanupJob } from '../../src/modules/scheduling/jobs/file-cleanup.job';
import { TaskRunner } from '../../src/modules/scheduling/core/task-runner';
import { NotificationHub } from '../../src/core/notificationHub';
import { errorHandler } from '../../src/middleware/errorHandler';

vi.mock('../../src/core/notificationHub', () => ({
    NotificationHub: {
        notify: vi.fn().mockResolvedValue({})
    }
}));

describe('Observability & Log Rotation Unit Tests', () => {
    const testLogDir = path.resolve('data/logs');
    const testLogFile = path.join(testLogDir, 'test-large.log');

    beforeEach(async () => {
        vi.clearAllMocks();
        await fs.promises.mkdir(testLogDir, { recursive: true });
    });

    afterEach(async () => {
        if (fs.existsSync(testLogFile)) {
            await fs.promises.unlink(testLogFile).catch(() => {});
        }
    });

    it('debe truncar un archivo de log que supere los 10MB para prevenir desbordamiento de disco', async () => {
        // Crear un archivo de 11 MB
        const elevenMB = 11 * 1024 * 1024;
        const dummyBuf = Buffer.alloc(elevenMB, 'A');
        await fs.promises.writeFile(testLogFile, dummyBuf);

        expect(fs.statSync(testLogFile).size).toBe(elevenMB);

        await FileCleanupJob.cleanupOldLogsAndBackups();

        const newSize = fs.statSync(testLogFile).size;
        expect(newSize).toBeLessThan(elevenMB);
        expect(newSize).toBe(512 * 1024); // Truncado a 512 KB
    });

    it('TaskRunner.safeRun debe alertar a NotificationHub cuando un job falla 3 veces consecutivas', async () => {
        const failingJob = vi.fn().mockRejectedValue(new Error('Fallo crítico simulado en base de datos'));

        // Primer fallo -> no notifica
        await TaskRunner.safeRun('TestJob', failingJob);
        expect(NotificationHub.notify).not.toHaveBeenCalled();

        // Segundo fallo -> no notifica
        await TaskRunner.safeRun('TestJob', failingJob);
        expect(NotificationHub.notify).not.toHaveBeenCalled();

        // Tercer fallo -> notifica a NotificationHub
        await TaskRunner.safeRun('TestJob', failingJob);
        expect(NotificationHub.notify).toHaveBeenCalledTimes(1);
        expect(NotificationHub.notify).toHaveBeenCalledWith(
            expect.objectContaining({
                title: expect.stringContaining('Fallo recurrente en TestJob'),
                type: 'error',
                source: 'scheduler'
            })
        );
    });

    it('errorHandler debe emitir alerta a NotificationHub ante errores de servidor 500', () => {
        const err = new Error('Base de datos no disponible');
        (err as any).statusCode = 500;

        const req: any = {
            method: 'POST',
            path: '/api/reminders',
            headers: {}
        };
        const res: any = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(NotificationHub.notify).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Error del Servidor (500)',
                type: 'error',
                source: 'http-server'
            })
        );
    });
});
