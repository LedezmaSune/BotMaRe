import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateTime } from 'luxon';
import { ReminderCheckerJob } from '../../src/modules/scheduling/jobs/reminder-checker.job';
import * as dbModule from '../../src/core/db';

vi.mock('../../src/core/db', () => ({
    listAllPendingReminders: vi.fn()
}));

vi.mock('../../src/telegram/notification.service', () => ({
    NotificationService: {
        notifyAdmin: vi.fn()
    }
}));

describe('ReminderCheckerJob Unit Tests (Real Production Module)', () => {
    const zone = 'America/Mexico_City';
    const mockNow = DateTime.fromISO('2026-08-11T10:00:00', { zone });

    describe('parseReminderTime', () => {
        it('identifies immediate keywords correctly', () => {
            expect(ReminderCheckerJob.parseReminderTime('inmediato', mockNow).isImmediate).toBe(true);
            expect(ReminderCheckerJob.parseReminderTime('ahora', mockNow).isImmediate).toBe(true);
            expect(ReminderCheckerJob.parseReminderTime('inmediatamente', mockNow).isImmediate).toBe(true);
        });

        it('parses standard ISO date strings', () => {
            const res = ReminderCheckerJob.parseReminderTime('2026-08-11T10:30', mockNow);
            expect(res.isValid).toBe(true);
            expect(res.dateTime?.hour).toBe(10);
            expect(res.dateTime?.minute).toBe(30);
        });

        it('parses short HH:mm by prepending current date', () => {
            const res = ReminderCheckerJob.parseReminderTime('15:45', mockNow);
            expect(res.isValid).toBe(true);
            expect(res.dateTime?.toFormat('yyyy-MM-dd')).toBe('2026-08-11');
            expect(res.dateTime?.hour).toBe(15);
            expect(res.dateTime?.minute).toBe(45);
        });

        it('parses natural language "mañana a las 14:00"', () => {
            const res = ReminderCheckerJob.parseReminderTime('mañana a las 14:00', mockNow);
            expect(res.isValid).toBe(true);
            expect(res.dateTime?.toFormat('yyyy-MM-dd')).toBe('2026-08-12');
            expect(res.dateTime?.hour).toBe(14);
            expect(res.dateTime?.minute).toBe(0);
        });

        it('normalizes space-separated datetime "2026-08-11 18:30"', () => {
            const res = ReminderCheckerJob.parseReminderTime('2026-08-11 18:30', mockNow);
            expect(res.isValid).toBe(true);
            expect(res.dateTime?.hour).toBe(18);
            expect(res.dateTime?.minute).toBe(30);
        });
    });

    describe('execute Job Execution & Expiration Window', () => {
        const originalEnv = { ...process.env };
        let mockQueue: any;
        let mockService: any;

        beforeEach(() => {
            vi.clearAllMocks();
            process.env = { ...originalEnv };
            process.env.MAX_DELAY_MINUTES = '120';

            mockQueue = {
                isBusy: vi.fn().mockReturnValue(false),
                enqueue: vi.fn()
            };

            mockService = {
                updateStatus: vi.fn().mockResolvedValue(true),
                logAudit: vi.fn().mockResolvedValue(true)
            };
        });

        afterEach(() => {
            process.env = { ...originalEnv };
        });

        it('debe encolar recordatorios que están a tiempo o con retraso aceptable', async () => {
            const nowISO = DateTime.now().setZone(zone).minus({ minutes: 10 }).toISO();
            const pendingReminders = [
                {
                    id: 101,
                    userId: 'u1',
                    chatId: 'c1',
                    text: 'Recordatorio normal',
                    time: nowISO,
                    status: 'pending' as const,
                    repeat: 'none',
                    timestamp: new Date().toISOString()
                }
            ];

            vi.mocked(dbModule.listAllPendingReminders).mockResolvedValue(pendingReminders as any);

            await ReminderCheckerJob.execute(mockQueue, mockService);

            expect(mockQueue.enqueue).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: 101 })])
            );
            expect(mockService.updateStatus).not.toHaveBeenCalled();
        });

        it('debe marcar como failed y saltar recordatorios que superen MAX_DELAY_MINUTES', async () => {
            // 180 minutos de retraso (> 120 maxDelayMinutes)
            const expiredISO = DateTime.now().setZone(zone).minus({ minutes: 180 }).toISO();
            const pendingReminders = [
                {
                    id: 202,
                    userId: 'u1',
                    chatId: 'c1',
                    text: 'Recordatorio muy retrasado',
                    time: expiredISO,
                    status: 'pending' as const,
                    repeat: 'none',
                    channel: 'whatsapp' as const,
                    timestamp: new Date().toISOString()
                }
            ];

            vi.mocked(dbModule.listAllPendingReminders).mockResolvedValue(pendingReminders as any);

            await ReminderCheckerJob.execute(mockQueue, mockService);

            // Debe marcarse como failed
            expect(mockService.updateStatus).toHaveBeenCalledWith(202, 'failed');
            expect(mockService.logAudit).toHaveBeenCalledWith(
                'system',
                'REMINDER_EXPIRED_SKIPPED',
                expect.objectContaining({ id: 202 })
            );
            // No debe entrar a la cola de despacho
            expect(mockQueue.enqueue).not.toHaveBeenCalled();
        });

        it('debe encolar recordatorios inmediatos sin importar la hora', async () => {
            const pendingReminders = [
                {
                    id: 303,
                    userId: 'u1',
                    chatId: 'c1',
                    text: 'Recordatorio express',
                    time: 'inmediato',
                    status: 'pending' as const,
                    repeat: 'none',
                    timestamp: new Date().toISOString()
                }
            ];

            vi.mocked(dbModule.listAllPendingReminders).mockResolvedValue(pendingReminders as any);

            await ReminderCheckerJob.execute(mockQueue, mockService);

            expect(mockQueue.enqueue).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: 303 })])
            );
        });

        it('debe omitir recordatorios que ya están ocupados en la cola', async () => {
            const pendingReminders = [
                {
                    id: 404,
                    userId: 'u1',
                    chatId: 'c1',
                    text: 'Recordatorio ocupado',
                    time: 'inmediato',
                    status: 'pending' as const,
                    repeat: 'none',
                    timestamp: new Date().toISOString()
                }
            ];

            vi.mocked(dbModule.listAllPendingReminders).mockResolvedValue(pendingReminders as any);
            mockQueue.isBusy.mockReturnValue(true);

            await ReminderCheckerJob.execute(mockQueue, mockService);

            expect(mockQueue.enqueue).not.toHaveBeenCalled();
        });
    });
});
