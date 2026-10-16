import { describe, it, expect, beforeEach } from 'vitest';
import { IDatabaseAdapter } from '../../src/core/db/db.adapter';

export interface ContractTestOptions {
    adapterName: string;
    getAdapter: () => Promise<IDatabaseAdapter>;
    cleanup?: () => Promise<void>;
}

/**
 * Batería de pruebas de contrato para implementaciones de IDatabaseAdapter (LowdbAdapter, MongoAdapter).
 * Valida la paridad de comportamiento y fija los casos de divergencia detectados en la auditoría.
 */
export function runDatabaseAdapterContractTests({ adapterName, getAdapter, cleanup }: ContractTestOptions) {
    describe(`IDatabaseAdapter Contract Tests: ${adapterName}`, () => {
        let adapter: IDatabaseAdapter;

        beforeEach(async () => {
            adapter = await getAdapter();
            if (cleanup) {
                await cleanup();
            }
        });

        // 1. getSettings() - Valores por defecto
        describe('1. getSettings()', () => {
            it('debe devolver claves básicas con valores por defecto consistentes', async () => {
                const settings = await adapter.getSettings();
                expect(settings).toBeDefined();
                expect(settings.bot_name).toBe('GravityBot');
                expect(settings.AI_ENABLED).toBe('true');
                expect(settings.system_prompt).toContain('Eres un asistente inteligente y servicial');
                expect(settings.possible_responses).toBeDefined();
            });
        });

        // 2. saveUser / getUser - Defaults y manejo de undefined
        describe('2. saveUser / getUser', () => {
            it('debe aplicar valores por defecto al registrar un nuevo usuario', async () => {
                const user = await adapter.saveUser('user_contract_1', {});
                expect(user).toBeDefined();
                expect(user?.id).toBe('user_contract_1');
                expect(user?.nombre).toBe('Sin Nombre');
                expect(user?.xp).toBe(0);
                expect(user?.nivel).toBe(1);
                expect(user?.rango).toBe('Novato');

                const fetched = await adapter.getUser('user_contract_1');
                expect(fetched).toEqual(user);
            });

            // NOTA FASE 1: Marcado temporalmente con it.fails porque Lowdb usa `{ ...data }`
            // al final y sobrescribe defaults con undefined. Se corrige en la FASE 2.
            it.fails('no debe sobrescribir valores por defecto si se pasan campos undefined', async () => {
                const user = await adapter.saveUser('user_contract_undef', {
                    nombre: undefined,
                    xp: undefined
                });
                expect(user).toBeDefined();
                expect(user?.nombre).toBe('Sin Nombre');
                expect(user?.xp).toBe(0);
            });
        });

        // 3. deleteRemindersBulk('pending' | 'sent' | 'all')
        describe('3. deleteRemindersBulk', () => {
            it('debe eliminar solo recordatorios no procesados con type="pending" conservando "sent"', async () => {
                const userId = 'user_bulk_pending';
                await adapter.createReminder(userId, 'c1', 'msg1', '10:00', undefined, undefined, 'none', undefined, undefined, 'T1', 'pending');
                await adapter.createReminder(userId, 'c1', 'msg2', '10:05', undefined, undefined, 'none', undefined, undefined, 'T2', 'processing');
                await adapter.createReminder(userId, 'c1', 'msg3', '10:10', undefined, undefined, 'none', undefined, undefined, 'T3', 'sent');
                await adapter.createReminder(userId, 'c1', 'msg4', '10:15', undefined, undefined, 'none', undefined, undefined, 'T4', 'failed');

                await adapter.deleteRemindersBulk(userId, 'pending');

                const remaining = await adapter.listReminders(userId, true);
                expect(remaining.length).toBe(1);
                expect(remaining[0].status).toBe('sent');
            });

            it('debe eliminar solo recordatorios "sent" con type="sent" conservando el resto', async () => {
                const userId = 'user_bulk_sent';
                await adapter.createReminder(userId, 'c1', 'msg1', '10:00', undefined, undefined, 'none', undefined, undefined, 'T1', 'pending');
                await adapter.createReminder(userId, 'c1', 'msg2', '10:10', undefined, undefined, 'none', undefined, undefined, 'T2', 'sent');

                await adapter.deleteRemindersBulk(userId, 'sent');

                const remaining = await adapter.listReminders(userId, true);
                expect(remaining.length).toBe(1);
                expect(remaining[0].status).toBe('pending');
            });

            it('debe eliminar todos los recordatorios con type="all"', async () => {
                const userId = 'user_bulk_all';
                await adapter.createReminder(userId, 'c1', 'msg1', '10:00', undefined, undefined, 'none', undefined, undefined, 'T1', 'pending');
                await adapter.createReminder(userId, 'c1', 'msg2', '10:10', undefined, undefined, 'none', undefined, undefined, 'T2', 'sent');

                await adapter.deleteRemindersBulk(userId, 'all');

                const remaining = await adapter.listReminders(userId, true);
                expect(remaining.length).toBe(0);
            });
        });

        // 4. checkReminderExistsByMediaPath
        describe('4. checkReminderExistsByMediaPath', () => {
            it('debe identificar multimedia con mayúsculas, minúsculas, rutas relativas y solo basename', async () => {
                const userId = 'user_media_test';
                await adapter.createReminder(
                    userId, 'c1', 'Media Msg', '10:00',
                    'uploads/Images/Receipt_Sample.JPG', 'image', 'none'
                );

                // Exacto
                expect(await adapter.checkReminderExistsByMediaPath('uploads/Images/Receipt_Sample.JPG')).toBe(true);
                // Minúsculas
                expect(await adapter.checkReminderExistsByMediaPath('uploads/images/receipt_sample.jpg')).toBe(true);
                // Ruta relativa con ./
                expect(await adapter.checkReminderExistsByMediaPath('./uploads/Images/Receipt_Sample.JPG')).toBe(true);
                // Solo basename
                expect(await adapter.checkReminderExistsByMediaPath('Receipt_Sample.JPG')).toBe(true);
                // Basename en minúsculas
                expect(await adapter.checkReminderExistsByMediaPath('receipt_sample.jpg')).toBe(true);
                // No existente
                expect(await adapter.checkReminderExistsByMediaPath('non_existing_file.jpg')).toBe(false);
            });
        });

        // 5. getSheetSyncSettings / saveSheetSyncSettings
        describe('5. getSheetSyncSettings / saveSheetSyncSettings', () => {
            it('debe guardar y recuperar la configuración de sincronización con Google Sheets íntegramente', async () => {
                const sheetConfig = {
                    spreadsheetId: 'sheet_abc_12345',
                    refreshToken: 'oauth_refresh_token_secret_xyz',
                    syncInterval: '1h' as const,
                    isActive: true,
                    authMethod: 'oauth' as const
                };

                await adapter.saveSheetSyncSettings(sheetConfig);
                const loaded = await adapter.getSheetSyncSettings();

                expect(loaded).toBeDefined();
                expect(loaded?.spreadsheetId).toBe(sheetConfig.spreadsheetId);
                expect(loaded?.refreshToken).toBe(sheetConfig.refreshToken);
                expect(loaded?.syncInterval).toBe(sheetConfig.syncInterval);
                expect(loaded?.isActive).toBe(true);
            });
        });

        // 6. updateReminderStatus y listAllPendingReminders
        describe('6. updateReminderStatus y listAllPendingReminders', () => {
            it('debe filtrar adecuadamente según las transiciones de estado', async () => {
                const userId = 'user_status_trans';
                const id = await adapter.createReminder(
                    userId, 'c1', 'Status Test Msg', '10:00',
                    undefined, undefined, 'none', undefined, undefined, 'Status Test', 'pending'
                );

                let pending = await adapter.listAllPendingReminders();
                expect(pending.some(r => r.id === id)).toBe(true);

                // Transición a processing
                await adapter.updateReminderStatus(id, 'processing');
                pending = await adapter.listAllPendingReminders();
                expect(pending.some(r => r.id === id)).toBe(false);

                // Transición a sent
                await adapter.updateReminderStatus(id, 'sent');
                pending = await adapter.listAllPendingReminders();
                expect(pending.some(r => r.id === id)).toBe(false);
            });
        });

        // 7. createReminder - IDs numéricos
        describe('7. createReminder generación de IDs', () => {
            it('debe generar IDs numéricos positivos válidos', async () => {
                const userId = 'user_concurrency';
                const id1 = await adapter.createReminder(userId, 'c1', 'Msg 1', '12:00');
                const id2 = await adapter.createReminder(userId, 'c1', 'Msg 2', '12:01');
                expect(typeof id1).toBe('number');
                expect(typeof id2).toBe('number');
                expect(id1).toBeGreaterThan(0);
                expect(id2).toBeGreaterThan(0);
            });
        });
    });
}
