import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scheduler } from '../../src/modules/scheduling/scheduler';
import { DeliveryDispatcher } from '../../src/modules/scheduling/services/delivery.dispatcher';
import { ReminderController } from '../../src/modules/reminders/reminder.controller';
import { AppError, errorHandler } from '../../src/middleware/errorHandler';
import { NotificationHub } from '../../src/core/notificationHub';
import * as dbModule from '../../src/core/db';

vi.mock('../../src/core/db', () => ({
    getReminderById: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    listPendingOrFailedReminders: vi.fn()
}));

vi.mock('../../src/core/notificationHub', () => ({
    NotificationHub: {
        notify: vi.fn().mockResolvedValue({})
    }
}));

vi.mock('../../src/modules/scheduling/services/delivery.dispatcher', () => ({
    DeliveryDispatcher: {
        dispatch: vi.fn()
    }
}));

describe('Reminder Send-Now & Conflict Handling Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Scheduler.sendNow', () => {
        it('debe lanzar AppError(503) si el scheduler no está inicializado', async () => {
            (Scheduler as any).waService = null;
            (Scheduler as any).reminderService = null;
            (Scheduler as any).smsService = null;

            await expect(Scheduler.sendNow(123)).rejects.toThrowError(AppError);
            try {
                await Scheduler.sendNow(123);
            } catch (err: any) {
                expect(err.statusCode).toBe(503);
                expect(err.message).toContain('Scheduler no ha sido inicializado');
            }
        });

        it('debe lanzar AppError(404) si el recordatorio no existe', async () => {
            (Scheduler as any).waService = { getStatus: () => ({ state: 'connected' }) };
            (Scheduler as any).reminderService = { updateStatus: vi.fn() };
            (Scheduler as any).smsService = {};
            vi.mocked(dbModule.getReminderById).mockResolvedValue(null);

            await expect(Scheduler.sendNow(999)).rejects.toThrowError(AppError);
            try {
                await Scheduler.sendNow(999);
            } catch (err: any) {
                expect(err.statusCode).toBe(404);
                expect(err.message).toBe('Recordatorio #999 no encontrado.');
            }
        });

        it('debe lanzar AppError(409) si el recordatorio ya se está procesando', async () => {
            (Scheduler as any).waService = { getStatus: () => ({ state: 'connected' }) };
            (Scheduler as any).reminderService = { updateStatus: vi.fn() };
            (Scheduler as any).smsService = {};
            vi.mocked(dbModule.getReminderById).mockResolvedValue({
                id: 100,
                status: 'processing',
                chatId: '5219991112233',
                text: 'Hola'
            } as any);

            await expect(Scheduler.sendNow(100)).rejects.toThrowError(AppError);
            try {
                await Scheduler.sendNow(100);
            } catch (err: any) {
                expect(err.statusCode).toBe(409);
                expect(err.message).toContain('ya se está procesando actualmente');
            }
        });

        it('debe lanzar AppError(409) si el recordatorio ya fue enviado previamente y force=false', async () => {
            (Scheduler as any).waService = { getStatus: () => ({ state: 'connected' }) };
            (Scheduler as any).reminderService = { updateStatus: vi.fn() };
            (Scheduler as any).smsService = {};
            vi.mocked(dbModule.getReminderById).mockResolvedValue({
                id: 1789668523546,
                status: 'sent',
                chatId: '5219991112233',
                text: 'Recordatorio test'
            } as any);

            await expect(Scheduler.sendNow(1789668523546)).rejects.toThrowError(AppError);
            try {
                await Scheduler.sendNow(1789668523546);
            } catch (err: any) {
                expect(err.statusCode).toBe(409);
                expect(err.message).toBe('El recordatorio #1789668523546 ya fue enviado previamente.');
            }
            expect(DeliveryDispatcher.dispatch).not.toHaveBeenCalled();
        });

        it('debe permitir despacho si el recordatorio está sent pero force=true', async () => {
            (Scheduler as any).waService = { getStatus: () => ({ state: 'connected' }) };
            (Scheduler as any).reminderService = { updateStatus: vi.fn() };
            (Scheduler as any).smsService = {};
            const sentReminder = {
                id: 1789668523546,
                status: 'sent',
                chatId: '5219991112233',
                text: 'Recordatorio test'
            };
            vi.mocked(dbModule.getReminderById).mockResolvedValue(sentReminder as any);
            vi.mocked(DeliveryDispatcher.dispatch).mockResolvedValue({ success: true, sentCount: 1 });

            await expect(Scheduler.sendNow(1789668523546, true)).resolves.not.toThrow();
            expect(DeliveryDispatcher.dispatch).toHaveBeenCalledWith(
                sentReminder,
                (Scheduler as any).waService,
                (Scheduler as any).smsService,
                (Scheduler as any).reminderService
            );
        });

        it('debe despachar normalmente si el recordatorio está pending', async () => {
            (Scheduler as any).waService = { getStatus: () => ({ state: 'connected' }) };
            (Scheduler as any).reminderService = { updateStatus: vi.fn() };
            (Scheduler as any).smsService = {};
            const pendingReminder = {
                id: 200,
                status: 'pending',
                chatId: '5219991112233',
                text: 'Mensaje pendiente'
            };
            vi.mocked(dbModule.getReminderById).mockResolvedValue(pendingReminder as any);
            vi.mocked(DeliveryDispatcher.dispatch).mockResolvedValue({ success: true, sentCount: 1 });

            await expect(Scheduler.sendNow(200)).resolves.not.toThrow();
            expect(DeliveryDispatcher.dispatch).toHaveBeenCalledTimes(1);
        });
    });

    describe('ReminderController.sendNow', () => {
        let controller: ReminderController;
        let mockService: any;

        beforeEach(() => {
            mockService = {};
            controller = new ReminderController(mockService);
        });

        it('debe rechazar con 400 si el parámetro ID no es numérico', async () => {
            const req: any = { params: { id: 'invalido' }, query: {}, body: {} };
            const res: any = { json: vi.fn(), status: vi.fn().mockReturnThis() };
            const next = vi.fn();

            await controller.sendNow(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = next.mock.calls[0][0];
            expect(err.statusCode).toBe(400);
            expect(err.message).toBe('ID de recordatorio inválido.');
        });

        it('debe delegar a Scheduler.sendNow con force=true si viene en query', async () => {
            const req: any = { params: { id: '1789668523546' }, query: { force: 'true' }, body: {} };
            const res: any = { json: vi.fn() };
            const next = vi.fn();

            const spy = vi.spyOn(Scheduler, 'sendNow').mockResolvedValue(undefined as any);

            await controller.sendNow(req, res, next);

            expect(spy).toHaveBeenCalledWith(1789668523546, true);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it('getMedia debe responder 404 si el recordatorio no tiene archivo adjunto', async () => {
            vi.mocked(dbModule.getReminderById).mockResolvedValue({
                id: 123,
                text: 'Sin archivo',
                mediaPath: null
            } as any);

            const req: any = { params: { id: '123' } };
            const res: any = { sendFile: vi.fn() };
            const next = vi.fn();

            await controller.getMedia(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = next.mock.calls[0][0];
            expect(err.statusCode).toBe(404);
            expect(err.message).toContain('no cuenta con archivo multimedia');
        });

        it('update debe permitir desasociar/eliminar archivo multimedia si removeMedia es true', async () => {
            const req: any = {
                params: { id: '123' },
                body: {
                    chatId: '5219991112233',
                    text: 'Texto actualizado',
                    time: '2026-10-30T10:00',
                    removeMedia: 'true'
                },
                files: []
            };
            const res: any = { json: vi.fn() };
            const next = vi.fn();

            await controller.update(req, res, next);

            expect(dbModule.updateReminder).toHaveBeenCalledWith(
                123,
                expect.objectContaining({
                    mediaPath: null,
                    mediaType: null,
                    text: 'Texto actualizado'
                })
            );
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('errorHandler y Notificaciones ante errores 409 vs 500', () => {
        it('NO debe emitir alerta a NotificationHub si el error es 409 Conflict', () => {
            const err = new AppError('El recordatorio #1789668523546 ya fue enviado previamente.', 409);
            const req: any = {
                method: 'POST',
                originalUrl: '/api/reminders/1789668523546/send-now',
                headers: {}
            };
            const res: any = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };
            const next = vi.fn();

            errorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    message: 'El recordatorio #1789668523546 ya fue enviado previamente.'
                })
            });
            // NotificationHub solo debe alertar para errores >= 500
            expect(NotificationHub.notify).not.toHaveBeenCalled();
        });
    });
});

