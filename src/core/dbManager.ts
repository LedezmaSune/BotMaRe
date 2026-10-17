import { IDatabaseAdapter } from './db/db.adapter';
import { MongoAdapter } from './db/mongo.adapter';
import { LowdbAdapter } from './db/lowdb.adapter';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData, MessageRow 
} from './db/interfaces';
import { cacheManager } from '../utils/cache';

// Re-exportamos interfaces para el resto de la aplicación
export * from './db/interfaces';
// Re-exportamos modelos para el migrator
export * from './db/mongo.models';

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
        const { runMigration } = require('./migrator');
        await runMigration();
        return;
    }

    // Lowdb solo se inicializa si DB_ENGINE === 'lowdb' o en ausencia de MONGO_URI
    console.log('🔄 [DB] Inicializando motor local Lowdb...');
    const lowAdapter = new LowdbAdapter();
    await lowAdapter.initDB();
    adapter = lowAdapter;
    
    // Execute automigrator
    const { runMigration } = require('./migrator');
    await runMigration();
}

export { generateNumericId } from '../utils/idGenerator';

export const setAdapter = (customAdapter: IDatabaseAdapter) => { adapter = customAdapter; };
export const getAdapter = (): IDatabaseAdapter => adapter;

// ==========================================
// PROXY DE MÉTODOS AL ADAPTADOR ACTIVO
// ==========================================

export const saveUser = (id: string, data: Partial<UserData>) => adapter.saveUser(id, data);
export const getUser = (id: string) => adapter.getUser(id);

export const getSettings = async (): Promise<Record<string, string>> => {
    const cached = cacheManager.get<Record<string, string>>('settings');
    if (cached) return cached;
    const dbSettings = await adapter.getSettings();
    const merged: Record<string, string> = { ...dbSettings };
    for (const [key, val] of Object.entries(process.env)) {
        if (val !== undefined && val !== '' && (merged[key] === undefined || merged[key] === null || merged[key] === '')) {
            merged[key] = val;
        }
    }
    cacheManager.set('settings', merged, 300000);
    return merged;
};
export const updateSettings = async (settings: Record<string, string>) => {
    const res = await adapter.updateSettings(settings);
    cacheManager.del('settings');
    cacheManager.del('all_config');
    return res;
};

export const addMessage = (userId: string, role: string, content: string) => adapter.addMessage(userId, role, content);
export const getHistory = (userId: string, limit?: number) => adapter.getHistory(userId, limit);
export const clearHistory = (userId: string) => adapter.clearHistory(userId);

export const logAudit = (userId: string, action: string, details: any) => adapter.logAudit(userId, action, details);
export const listAudits = (limit?: number) => adapter.listAudits(limit);

export const createReminder = (userId: string, chatId: string, text: string, time: string, mediaPath?: string, mediaType?: string, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string, status?: 'pending' | 'processing' | 'sent' | 'failed', channel?: 'whatsapp' | 'sms') => adapter.createReminder(userId, chatId, text, time, mediaPath, mediaType, repeat, repeatInterval, repeatUnit, title, status, channel);
export const createRemindersBulk = (userId: string, items: Array<any>) => adapter.createRemindersBulk(userId, items);
export const listReminders = (userId: string, includeProcessed?: boolean) => adapter.listReminders(userId, includeProcessed);
export const deleteReminder = (id: number) => adapter.deleteReminder(id);
export const updateReminderStatus = (id: number, status: 'pending' | 'processing' | 'sent' | 'failed') => adapter.updateReminderStatus(id, status);
export const deleteRemindersBulk = (userId: string, type: 'all' | 'pending' | 'sent' | 'failed') => adapter.deleteRemindersBulk(userId, type);
export const getReminderById = (id: number) => adapter.getReminderById(id);
export const listAllPendingReminders = () => adapter.listAllPendingReminders();
export const listPendingMediaPaths = () => adapter.listPendingMediaPaths();
export const updateReminder = (id: number, data: Partial<ReminderData>) => adapter.updateReminder(id, data);
export const listPendingOrFailedReminders = () => adapter.listPendingOrFailedReminders();
export const checkReminderExistsByMediaPath = (mediaPath: string) => adapter.checkReminderExistsByMediaPath(mediaPath);

export const listTemplates = async () => {
    const cached = cacheManager.get<any[]>('templates');
    if (cached) return cached;
    const templates = await adapter.listTemplates();
    cacheManager.set('templates', templates, 300000);
    return templates;
};
export const createTemplate = async (name: string, content: string) => {
    const res = await adapter.createTemplate(name, content);
    cacheManager.del('templates');
    return res;
};
export const deleteTemplate = async (id: number) => {
    const res = await adapter.deleteTemplate(id);
    cacheManager.del('templates');
    return res;
};
export const updateTemplate = async (id: number, name: string, content: string) => {
    const res = await adapter.updateTemplate(id, name, content);
    cacheManager.del('templates');
    return res;
};

export const pauseChat = (chatId: string, reason: string, durationHours?: number) => adapter.pauseChat(chatId, reason, durationHours);
export const unpauseChat = (chatId: string) => adapter.unpauseChat(chatId);
export const isChatPaused = (chatId: string) => adapter.isChatPaused(chatId);
export const listPausedChats = () => adapter.listPausedChats();

export const listAutoresponders = async () => {
    const cached = cacheManager.get<any[]>('autoresponders');
    if (cached) return cached;
    const autoresponders = await adapter.listAutoresponders();
    cacheManager.set('autoresponders', autoresponders, 300000);
    return autoresponders;
};
export const createAutoresponder = async (keyword: string, matchType: string, response: string, aiAction: string, isActive?: boolean, parentId?: number | null, options?: string | null) => {
    const res = await adapter.createAutoresponder(keyword, matchType, response, aiAction, isActive, parentId, options);
    cacheManager.del('autoresponders');
    return res;
};
export const updateAutoresponder = async (id: number, keyword: string, matchType: string, response: string, aiAction: string, isActive: boolean, parentId?: number | null, options?: string | null) => {
    const res = await adapter.updateAutoresponder(id, keyword, matchType, response, aiAction, isActive, parentId, options);
    cacheManager.del('autoresponders');
    return res;
};
export const toggleAutoresponder = async (id: number, isActive: boolean) => {
    const res = await adapter.toggleAutoresponder(id, isActive);
    cacheManager.del('autoresponders');
    return res;
};
export const deleteAutoresponder = async (id: number) => {
    const res = await adapter.deleteAutoresponder(id);
    cacheManager.del('autoresponders');
    return res;
};

export const getUserState = (chatId: string) => adapter.getUserState(chatId);
export const setUserState = (chatId: string, currentMenuId: number | null) => adapter.setUserState(chatId, currentMenuId);

export const getSheetSyncSettings = () => adapter.getSheetSyncSettings();
export const saveSheetSyncSettings = (settings: any) => adapter.saveSheetSyncSettings(settings);

export const getActiveEngine = () => adapter.getActiveEngine();
export const recoverOrphanedProcessingReminders = async (): Promise<number> => {
    if (adapter && typeof adapter.recoverOrphanedProcessingReminders === 'function') {
        return await adapter.recoverOrphanedProcessingReminders();
    }
    return 0;
};
