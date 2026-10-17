import { IDatabaseAdapter } from './db.adapter';
import { MongoAdapter } from './mongo.adapter';
import { LowdbAdapter } from './lowdb.adapter';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData, MessageRow,
    SheetSyncSettings
} from './interfaces';
import { DEFAULT_BOT_SETTINGS } from './helpers';
import { cacheManager } from '../../utils/cache';

// Re-exportamos interfaces de dominio para los consumidores de la capa de datos
export * from './interfaces';
export type { IDatabaseAdapter } from './db.adapter';
export { generateNumericId } from '../../utils/idGenerator';

let adapter: IDatabaseAdapter;

export async function initDB(): Promise<void> {
    const dbEngine = (process.env.DB_ENGINE || '').toLowerCase().trim();
    const mongoUri = process.env.MONGO_URI;
    const hasMongoConfig = Boolean(mongoUri && mongoUri !== 'tu_url_de_atlas_aqui');

    // SEGURIDAD: Sin fallback silencioso de Mongo a Lowdb.
    // Si DB_ENGINE === 'mongodb' o si MONGO_URI está configurada (y DB_ENGINE no es explícitamente 'lowdb'),
    // se DEBE usar MongoDB. Si falla la conexión a Mongo, se lanza error para abortar el arranque.
    const shouldUseMongo = dbEngine === 'mongodb' || (hasMongoConfig && dbEngine !== 'lowdb');

    if (shouldUseMongo) {
        if (!hasMongoConfig) {
            throw new Error('[DB] Motor configurado como MongoDB pero MONGO_URI no está configurada o es inválida.');
        }
        console.log('🔄 [DB] Conectando a MongoDB Atlas...');
        adapter = new MongoAdapter();
        await adapter.initDB();
        
        // Execute automigrator once Mongo is ready
        const { runMigration } = require('../migrator');
        await runMigration();

        // Sincronizar CRM, listas de acceso y telemetría con MongoDB
        try {
            const { crmService } = require('../crm.service');
            const { accessControl } = require('../accessControl');
            const { telemetry } = require('../telemetry');
            await Promise.all([
                crmService.syncWithEngine?.(),
                accessControl.syncWithEngine?.(),
                telemetry.syncWithEngine?.()
            ]);
        } catch (e) {
            console.warn('⚠️ [DB] Error al sincronizar servicios secundarios con MongoDB:', e);
        }
        return;
    }

    // Lowdb solo se inicializa si DB_ENGINE === 'lowdb' o en ausencia de MONGO_URI
    console.log('🔄 [DB] Inicializando motor local Lowdb...');
    const lowAdapter = new LowdbAdapter();
    await lowAdapter.initDB();
    adapter = lowAdapter;
    
    // Execute automigrator
    const { runMigration } = require('../migrator');
    await runMigration();
}

export const setAdapter = (customAdapter: IDatabaseAdapter) => { adapter = customAdapter; };
export const getAdapter = (): IDatabaseAdapter => adapter;

// ==========================================
// PROXY DE MÉTODOS FUERTEMENTE TIPADOS AL ADAPTADOR ACTIVO
// ==========================================

export const saveUser: IDatabaseAdapter['saveUser'] = (...args) => adapter.saveUser(...args);
export const getUser: IDatabaseAdapter['getUser'] = (...args) => adapter.getUser(...args);

export const getSettings: IDatabaseAdapter['getSettings'] = async (): Promise<Record<string, string>> => {
    const cached = cacheManager.get<Record<string, string>>('settings');
    if (cached) return cached;
    const dbSettings = await adapter.getSettings();
    const merged: Record<string, string> = { ...DEFAULT_BOT_SETTINGS, ...dbSettings };
    for (const [key, val] of Object.entries(process.env)) {
        if (val !== undefined && val !== '' && (merged[key] === undefined || merged[key] === null || merged[key] === '')) {
            merged[key] = val;
        }
    }
    cacheManager.set('settings', merged, 300000);
    return merged;
};

export const updateSettings: IDatabaseAdapter['updateSettings'] = async (settings: Record<string, string>): Promise<void> => {
    const res = await adapter.updateSettings(settings);
    cacheManager.del('settings');
    cacheManager.del('all_config');
    return res;
};

export const addMessage: IDatabaseAdapter['addMessage'] = (...args) => adapter.addMessage(...args);
export const getHistory: IDatabaseAdapter['getHistory'] = (...args) => adapter.getHistory(...args);
export const clearHistory: IDatabaseAdapter['clearHistory'] = (...args) => adapter.clearHistory(...args);

export const logAudit: IDatabaseAdapter['logAudit'] = (...args) => adapter.logAudit(...args);
export const listAudits: IDatabaseAdapter['listAudits'] = (...args) => adapter.listAudits(...args);

export const createReminder: IDatabaseAdapter['createReminder'] = (...args) => adapter.createReminder(...args);
export const createRemindersBulk: IDatabaseAdapter['createRemindersBulk'] = (...args) => adapter.createRemindersBulk(...args);
export const listReminders: IDatabaseAdapter['listReminders'] = (...args) => adapter.listReminders(...args);
export const deleteReminder: IDatabaseAdapter['deleteReminder'] = (...args) => adapter.deleteReminder(...args);
export const updateReminderStatus: IDatabaseAdapter['updateReminderStatus'] = (...args) => adapter.updateReminderStatus(...args);
export const deleteRemindersBulk: IDatabaseAdapter['deleteRemindersBulk'] = (...args) => adapter.deleteRemindersBulk(...args);
export const getReminderById: IDatabaseAdapter['getReminderById'] = (...args) => adapter.getReminderById(...args);
export const listAllPendingReminders: IDatabaseAdapter['listAllPendingReminders'] = (...args) => adapter.listAllPendingReminders(...args);
export const listPendingMediaPaths: IDatabaseAdapter['listPendingMediaPaths'] = (...args) => adapter.listPendingMediaPaths(...args);
export const updateReminder: IDatabaseAdapter['updateReminder'] = (...args) => adapter.updateReminder(...args);
export const listPendingOrFailedReminders: IDatabaseAdapter['listPendingOrFailedReminders'] = (...args) => adapter.listPendingOrFailedReminders(...args);
export const checkReminderExistsByMediaPath: IDatabaseAdapter['checkReminderExistsByMediaPath'] = (...args) => adapter.checkReminderExistsByMediaPath(...args);

export const listTemplates: IDatabaseAdapter['listTemplates'] = async () => {
    const cached = cacheManager.get<TemplateData[]>('templates');
    if (cached) return cached;
    const templates = await adapter.listTemplates();
    cacheManager.set('templates', templates, 300000);
    return templates;
};

export const createTemplate: IDatabaseAdapter['createTemplate'] = async (name: string, content: string) => {
    const res = await adapter.createTemplate(name, content);
    cacheManager.del('templates');
    return res;
};

export const deleteTemplate: IDatabaseAdapter['deleteTemplate'] = async (id: number) => {
    const res = await adapter.deleteTemplate(id);
    cacheManager.del('templates');
    return res;
};

export const updateTemplate: IDatabaseAdapter['updateTemplate'] = async (id: number, name: string, content: string) => {
    const res = await adapter.updateTemplate(id, name, content);
    cacheManager.del('templates');
    return res;
};

export const pauseChat: IDatabaseAdapter['pauseChat'] = (...args) => adapter.pauseChat(...args);
export const unpauseChat: IDatabaseAdapter['unpauseChat'] = (...args) => adapter.unpauseChat(...args);
export const isChatPaused: IDatabaseAdapter['isChatPaused'] = (...args) => adapter.isChatPaused(...args);
export const listPausedChats: IDatabaseAdapter['listPausedChats'] = (...args) => adapter.listPausedChats(...args);

export const listAutoresponders: IDatabaseAdapter['listAutoresponders'] = async () => {
    const cached = cacheManager.get<AutoresponderData[]>('autoresponders');
    if (cached) return cached;
    const autoresponders = await adapter.listAutoresponders();
    cacheManager.set('autoresponders', autoresponders, 300000);
    return autoresponders;
};

export const createAutoresponder: IDatabaseAdapter['createAutoresponder'] = async (...args) => {
    const res = await adapter.createAutoresponder(...args);
    cacheManager.del('autoresponders');
    return res;
};

export const updateAutoresponder: IDatabaseAdapter['updateAutoresponder'] = async (...args) => {
    const res = await adapter.updateAutoresponder(...args);
    cacheManager.del('autoresponders');
    return res;
};

export const toggleAutoresponder: IDatabaseAdapter['toggleAutoresponder'] = async (id: number, isActive: boolean) => {
    const res = await adapter.toggleAutoresponder(id, isActive);
    cacheManager.del('autoresponders');
    return res;
};

export const deleteAutoresponder: IDatabaseAdapter['deleteAutoresponder'] = async (id: number) => {
    const res = await adapter.deleteAutoresponder(id);
    cacheManager.del('autoresponders');
    return res;
};

export const getUserState: IDatabaseAdapter['getUserState'] = (...args) => adapter.getUserState(...args);
export const setUserState: IDatabaseAdapter['setUserState'] = (...args) => adapter.setUserState(...args);

export const getSheetSyncSettings: IDatabaseAdapter['getSheetSyncSettings'] = () => adapter.getSheetSyncSettings();
export const saveSheetSyncSettings: IDatabaseAdapter['saveSheetSyncSettings'] = (settings: SheetSyncSettings) => adapter.saveSheetSyncSettings(settings);

export const getActiveEngine: IDatabaseAdapter['getActiveEngine'] = () => adapter ? adapter.getActiveEngine() : 'none';

export const recoverOrphanedProcessingReminders = async (): Promise<number> => {
    if (adapter && typeof adapter.recoverOrphanedProcessingReminders === 'function') {
        return await adapter.recoverOrphanedProcessingReminders();
    }
    return 0;
};
