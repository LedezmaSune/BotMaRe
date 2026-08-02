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

export let isMongo = false;
export let ldb: any = null;
let adapter: IDatabaseAdapter;

export async function initDB(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri && mongoUri !== 'tu_url_de_atlas_aqui') {
        try {
            adapter = new MongoAdapter();
            await adapter.initDB();
            isMongo = true;
            
            // Execute automigrator once Mongo is ready
            const { runMigration } = require('./migrator');
            await runMigration();
            return;
        } catch (error) {
            console.warn('⚠️ [DB] Falló la conexión a MongoDB Atlas. Iniciando Fallback a Lowdb...');
        }
    } else {
        console.warn('⚠️ [DB] MONGO_URI no configurado en el .env. Iniciando Fallback a Lowdb...');
    }

    // Lowdb Fallback initialization
    try {
        const lowAdapter = new LowdbAdapter();
        await lowAdapter.initDB();
        adapter = lowAdapter;
        isMongo = false;
        ldb = lowAdapter.getRawDb();
        
        // Execute automigrator
        const { runMigration } = require('./migrator');
        await runMigration();
    } catch (err) {
        console.error('❌ [DB] Error crítico al inicializar Lowdb:', err);
    }
}

export function generateNumericId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// ==========================================
// PROXY DE MÉTODOS AL ADAPTADOR ACTIVO
// ==========================================

export const saveUser = (id: string, data: Partial<UserData>) => adapter.saveUser(id, data);
export const getUser = (id: string) => adapter.getUser(id);

export const getSettings = async () => {
    const cached = cacheManager.get<Record<string, string>>('settings');
    if (cached) return cached;
    const settings = await adapter.getSettings();
    cacheManager.set('settings', settings, 300000);
    return settings;
};
export const updateSettings = async (settings: Record<string, string>) => {
    const res = await adapter.updateSettings(settings);
    cacheManager.del('settings');
    return res;
};

export const addMessage = (userId: string, role: string, content: string) => adapter.addMessage(userId, role, content);
export const getHistory = (userId: string, limit?: number) => adapter.getHistory(userId, limit);
export const clearHistory = (userId: string) => adapter.clearHistory(userId);

export const logAudit = (userId: string, action: string, details: any) => adapter.logAudit(userId, action, details);
export const listAudits = (limit?: number) => adapter.listAudits(limit);

export const createReminder = (userId: string, chatId: string, text: string, time: string, mediaPath?: string, mediaType?: string, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string, status?: 'pending' | 'processing' | 'sent' | 'failed', channel?: 'whatsapp' | 'sms') => adapter.createReminder(userId, chatId, text, time, mediaPath, mediaType, repeat, repeatInterval, repeatUnit, title, status, channel);
export const listReminders = (userId: string, includeProcessed?: boolean) => adapter.listReminders(userId, includeProcessed);
export const deleteReminder = (id: number) => adapter.deleteReminder(id);
export const updateReminderStatus = (id: number, status: 'pending' | 'processing' | 'sent' | 'failed') => adapter.updateReminderStatus(id, status);
export const deleteRemindersBulk = (userId: string, type: 'all' | 'pending' | 'sent') => adapter.deleteRemindersBulk(userId, type);
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
