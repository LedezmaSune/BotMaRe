import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeTool, allTools, restrictedTools } from '../../src/tools/index';
import { LowdbAdapter } from '../../src/core/db/lowdb.adapter';
import { initDB } from '../../src/core/dbManager';

describe('FASE 8: Errores Silenciosos, Autorización en Herramientas y Recuperación', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    describe('Autorización en Ejecutor de Herramientas (executeTool)', () => {
        it('debe permitir herramientas restringidas a usuarios comunes (fullAccess = false)', async () => {
            // 'get_current_time' está en restrictedTools
            const result = await executeTool('get_current_time', {}, 'user123', 'chat123', false);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });

        it('debe rechazar herramientas de alto privilegio si fullAccess es false', async () => {
            const privilegedToolNames = [
                'manage_wa_session',
                'restart_bot_service',
                'update_bot_settings',
                'manage_access_lists'
            ];

            for (const toolName of privilegedToolNames) {
                await expect(
                    executeTool(toolName, {}, 'user_non_admin', 'chat123', false)
                ).rejects.toThrow(/Acceso denegado: La herramienta .* requiere privilegios elevados/);
            }
        });

        it('debe rechazar herramientas privilegiadas por defecto si el flag no se provee', async () => {
            await expect(
                (executeTool as any)('restart_bot_service', {}, 'user1', 'chat1')
            ).rejects.toThrow(/Acceso denegado/);
        });

        it('debe permitir herramientas privilegiadas cuando fullAccess = true', async () => {
            // Mockeamos la herramienta de reinicio para no reiniciar realmente
            const restartTool = allTools.find(t => t.definition.name === 'restart_bot_service');
            expect(restartTool).toBeDefined();
            const originalHandler = restartTool!.handler;
            restartTool!.handler = vi.fn().mockResolvedValue('{"success":true,"message":"Servicio reiniciado"}');

            try {
                const result = await executeTool('restart_bot_service', {}, 'admin', 'chat1', true);
                expect(result).toContain('Servicio reiniciado');
                expect(restartTool!.handler).toHaveBeenCalled();
            } finally {
                restartTool!.handler = originalHandler;
            }
        });

        it('debe lanzar error de herramienta no encontrada si no existe en allTools', async () => {
            await expect(
                executeTool('non_existent_tool_xyz', {}, 'user1', 'chat1', true)
            ).rejects.toThrow(/Tool non_existent_tool_xyz not found/);
        });
    });

    describe('isChatPaused y listAllPendingReminders - No Ocultar Fallos de BD', () => {
        it('debe lanzar excepción si la base de datos falla al consultar estado de pausa', async () => {
            const adapter = new LowdbAdapter();
            (adapter as any).ldb = {
                data: null // Provoca que acceder a .paused_chats lance TypeError
            };

            await expect(adapter.isChatPaused('chat123')).rejects.toThrow();
        });

        it('debe lanzar excepción si la base de datos falla al listar recordatorios pendientes en lugar de retornar array vacío', async () => {
            const adapter = new LowdbAdapter();
            (adapter as any).ldb = {
                data: null // Provoca que acceder a .reminders lance TypeError
            };

            await expect(adapter.listAllPendingReminders()).rejects.toThrow();
        });
    });

    describe('Recuperación de Recordatorios Huérfanos (recoverOrphanedProcessingReminders)', () => {
        it('debe cambiar recordatorios de status "processing" a "pending" y retornar el conteo', async () => {
            const adapter = new LowdbAdapter();
            const mockWrite = vi.fn().mockResolvedValue(undefined);
            const reminders = [
                { id: 1, userId: 'u1', text: 'R1', time: '10:00', status: 'processing' },
                { id: 2, userId: 'u1', text: 'R2', time: '11:00', status: 'sent' },
                { id: 3, userId: 'u2', text: 'R3', time: '12:00', status: 'pending' },
                { id: 4, userId: 'u2', text: 'R4', time: '13:00', status: 'processing' }
            ];

            (adapter as any).ldb = {
                data: { reminders },
                write: mockWrite
            };

            const recoveredCount = await adapter.recoverOrphanedProcessingReminders();

            expect(recoveredCount).toBe(2);
            expect(reminders[0].status).toBe('pending');
            expect(reminders[1].status).toBe('sent');
            expect(reminders[2].status).toBe('pending');
            expect(reminders[3].status).toBe('pending');
            expect(mockWrite).toHaveBeenCalled();
        });

        it('debe retornar 0 y no escribir si no hay recordatorios huérfanos', async () => {
            const adapter = new LowdbAdapter();
            const mockWrite = vi.fn().mockResolvedValue(undefined);
            const reminders = [
                { id: 1, userId: 'u1', text: 'R1', time: '10:00', status: 'pending' },
                { id: 2, userId: 'u1', text: 'R2', time: '11:00', status: 'sent' }
            ];

            (adapter as any).ldb = {
                data: { reminders },
                write: mockWrite
            };

            const recoveredCount = await adapter.recoverOrphanedProcessingReminders();
            expect(recoveredCount).toBe(0);
            expect(mockWrite).not.toHaveBeenCalled();
        });
    });

    describe('Eliminación de Fallback Silencioso Mongo -> Lowdb', () => {
        it('debe fallar y lanzar error si MONGO_URI está configurada y la conexión falla', async () => {
            process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';
            delete process.env.DB_ENGINE;

            const { MongoAdapter } = await import('../../src/core/db/mongo.adapter');
            vi.spyOn(MongoAdapter.prototype, 'initDB').mockRejectedValue(new Error('Mongo connection refused'));

            // En lugar de hacer fallback silencioso a Lowdb, debe lanzar error
            await expect(initDB()).rejects.toThrow('Mongo connection refused');
        });
    });
});
