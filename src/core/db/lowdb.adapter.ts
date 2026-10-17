import path from 'path';
import { IDatabaseAdapter } from './db.adapter';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData, MessageRow, SheetSyncSettings
} from './interfaces';
import { generateNumericId } from '../../utils/idGenerator';
import { DEFAULT_BOT_SETTINGS, applyUserDefaults, mergeUserData, normalizeMediaBasename } from './helpers';

import { JSONFile } from 'lowdb/node';
import { Low } from 'lowdb';

type Schema = {
    users: UserData[];
    settings: {key: string, value: string}[];
    reminders: ReminderData[];
    messages: any[];
    audits: any[];
    templates: any[];
    paused_chats: PausedChatData[];
    autoresponders: AutoresponderData[];
    user_states: any[];
    sheet_sync_settings: SheetSyncSettings | null;
};

export class LowdbAdapter implements IDatabaseAdapter {
    private ldb!: Low<Schema>;
    private customDbPath?: string;

    constructor(customDbPath?: string) {
        this.customDbPath = customDbPath;
    }

    async initDB(customPath?: string): Promise<void> {
        try {
            const dbPath = path.resolve(customPath || this.customDbPath || 'data/database.json');
            const adapter = new JSONFile<Schema>(dbPath);
            const defaultData: Schema = {
                users: [], settings: [], reminders: [], messages: [], 
                audits: [], templates: [], paused_chats: [], autoresponders: [], user_states: [], sheet_sync_settings: null
            };
            this.ldb = new Low<Schema>(adapter, defaultData);
            
            await this.ldb.read();
            await this.ldb.write();
            
            console.log(`✅ [DB] Base de datos local Lowdb inicializada correctamente en ${dbPath}.`);
        } catch (err) {
            console.error('❌ [DB] Error crítico al inicializar Lowdb:', err);
            throw err;
        }
    }

    getRawDb() {
        return this.ldb;
    }

    async saveUser(id: string, data: Partial<UserData>): Promise<UserData | null> {
        try {
            let user = this.ldb.data.users.find(u => u.id === id);
            if (user) {
                const merged = mergeUserData(user, data);
                Object.assign(user, merged);
            } else {
                const newUser = applyUserDefaults(id, data);
                this.ldb.data.users.push(newUser);
                user = newUser;
            }
            await this.ldb.write();
            return user;
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.saveUser] Error al guardar usuario ${id} en Lowdb:`, error);
            throw error;
        }
    }

    async getUser(id: string): Promise<UserData | null> {
        try {
            const user = this.ldb.data.users.find(u => u.id === id);
            return user || null;
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.getUser] Error al obtener usuario ${id} de Lowdb:`, error);
            throw error;
        }
    }

    async getSettings(): Promise<Record<string, string>> {
        try {
            const rows = this.ldb.data.settings || [];
            const loaded = rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
            const merged = { ...DEFAULT_BOT_SETTINGS };
            for (const [key, val] of Object.entries(process.env)) {
                if (val !== undefined && val !== '' && (loaded[key] === undefined || loaded[key] === null || loaded[key] === '')) {
                    merged[key] = val;
                }
            }
            for (const [key, val] of Object.entries(loaded)) {
                if (val !== undefined && val !== null && val !== '') {
                    merged[key] = String(val);
                }
            }
            return merged;
        } catch (error) {
            console.warn('⚠️ [DB:LowdbAdapter.getSettings] Error al leer configuraciones:', error);
            return { ...DEFAULT_BOT_SETTINGS };
        }
    }

    async updateSettings(settings: Record<string, string>): Promise<void> {
        try {
            if (!settings || typeof settings !== 'object') return;
            for (const [rawKey, rawValue] of Object.entries(settings)) {
                if (typeof rawKey !== 'string' || !rawKey.trim()) continue;
                const key = rawKey.trim();
                const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
                const exists = this.ldb.data.settings.find(s => s.key === key);
                if (exists) {
                    exists.value = value;
                } else {
                    this.ldb.data.settings.push({ key, value });
                }
            }
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.updateSettings] Error al actualizar configuraciones en Lowdb:', error);
            throw error;
        }
    }

    async addMessage(userId: string, role: string, content: string): Promise<void> {
        try {
            this.ldb.data.messages.push({ userId, role, content, timestamp: new Date() });
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.addMessage] Error al guardar mensaje en Lowdb:', error);
            throw error;
        }
    }

    async getHistory(userId: string, limit: number = 50): Promise<MessageRow[]> {
        try {
            const all = this.ldb.data.messages.filter(m => m.userId === userId) || [];
            const sorted = all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const sliced = sorted.slice(0, limit);
            return sliced.reverse().map((row: any) => ({
                role: row.role as any, content: row.content
            }));
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.getHistory] Error al obtener historial de ${userId}:`, error);
            throw error;
        }
    }

    async clearHistory(userId: string): Promise<void> {
        try {
            this.ldb.data.messages = this.ldb.data.messages.filter(m => m.userId !== userId);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.clearHistory] Error al vaciar historial en Lowdb:', error);
            throw error;
        }
    }

    async logAudit(userId: string, action: string, details: any): Promise<void> {
        const detailsStr = JSON.stringify(details);
        try {
            this.ldb.data.audits.push({ userId, action, details: detailsStr, timestamp: new Date() });
            await this.ldb.write();
            console.log(`[Audit Logged] ${action} for user ${userId}`);
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.logAudit] Error al registrar auditoría en Lowdb:', error);
            throw error;
        }
    }

    async listAudits(limit: number = 10): Promise<any[]> {
        try {
            const list = [...this.ldb.data.audits];
            const sorted = list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return sorted.slice(0, limit);
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listAudits] Error al obtener auditorias en Lowdb:', error);
            throw error;
        }
    }

    async createReminder(
        userId: string, chatId: string, text: string, time: string,
        mediaPath?: string, mediaType?: string, repeat: string = 'none',
        repeatInterval?: number, repeatUnit?: string, title?: string,
        status: 'pending' | 'processing' | 'sent' | 'failed' = 'pending',
        channel: 'whatsapp' | 'sms' = 'whatsapp'
    ): Promise<number> {
        const id = generateNumericId();
        const payload: ReminderData = {
            id, userId, chatId, title, text, time, mediaPath, mediaType,
            status, repeat, repeatInterval, repeatUnit, channel, timestamp: new Date().toISOString()
        };
        try {
            this.ldb.data.reminders.push(payload);
            await this.ldb.write();
            return id;
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.createReminder] Error al crear recordatorio en Lowdb:', error);
            throw error;
        }
    }

    async createRemindersBulk(
        userId: string,
        items: Array<{
            chatId: string;
            text: string;
            time: string;
            mediaPath?: string;
            mediaType?: string;
            repeat?: string;
            repeatInterval?: number;
            repeatUnit?: string;
            title?: string;
            status?: 'pending' | 'processing' | 'sent' | 'failed';
            channel?: 'whatsapp' | 'sms';
        }>
    ): Promise<number[]> {
        const ids: number[] = [];
        try {
            for (const item of items) {
                const id = generateNumericId();
                ids.push(id);
                this.ldb.data.reminders.push({
                    id,
                    userId,
                    chatId: item.chatId,
                    title: item.title,
                    text: item.text,
                    time: item.time,
                    mediaPath: item.mediaPath,
                    mediaType: item.mediaType,
                    status: item.status || 'pending',
                    repeat: item.repeat || 'none',
                    repeatInterval: item.repeatInterval,
                    repeatUnit: item.repeatUnit,
                    channel: item.channel || 'whatsapp',
                    timestamp: new Date().toISOString()
                });
            }
            await this.ldb.write();
            return ids;
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.createRemindersBulk] Error al crear recordatorios masivos en Lowdb:', error);
            throw error;
        }
    }

    async listReminders(userId: string, includeProcessed: boolean = false): Promise<any[]> {
        try {
            let list = this.ldb.data.reminders.filter(r => r.userId === userId);
            if (!includeProcessed) {
                list = list.filter((r: any) => r.status === 'pending');
            }
            if (includeProcessed) {
                return list.sort((a: any, b: any) => b.time.localeCompare(a.time) || b.id - a.id);
            } else {
                return list.sort((a: any, b: any) => a.time.localeCompare(b.time) || a.id - b.id);
            }
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.listReminders] Error al listar recordatorios para ${userId}:`, error);
            throw error;
        }
    }

    async deleteReminder(id: number): Promise<void> {
        try {
            this.ldb.data.reminders = this.ldb.data.reminders.filter(r => r.id !== id);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.deleteReminder] Error al eliminar recordatorio en Lowdb:', error);
            throw error;
        }
    }

    async updateReminderStatus(id: number, status: 'pending' | 'processing' | 'sent' | 'failed'): Promise<void> {
        try {
            const r = this.ldb.data.reminders.find(rem => rem.id === id);
            if (r) {
                r.status = status;
                await this.ldb.write();
            }
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.updateReminderStatus] Error al actualizar estado de recordatorio en Lowdb:', error);
            throw error;
        }
    }

    async deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent' | 'failed'): Promise<void> {
        try {
            this.ldb.data.reminders = this.ldb.data.reminders.filter(r => {
                if (r.userId !== userId) return true; // conserva los de otros usuarios
                if (type === 'pending') {
                    // Elimina los no procesados (pending, processing, failed), conserva sent
                    return r.status === 'sent';
                }
                if (type === 'sent') {
                    // Elimina sent, conserva los no procesados
                    return r.status !== 'sent';
                }
                if (type === 'failed') {
                    // Elimina failed, conserva los demás
                    return r.status !== 'failed';
                }
                if (type === 'all') {
                    return false; // Elimina todos los del usuario
                }
                return true;
            });
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.deleteRemindersBulk] Error en eliminación masiva en Lowdb:', error);
            throw error;
        }
    }

    async getReminderById(id: number): Promise<any | null> {
        try {
            return this.ldb.data.reminders.find(r => r.id === id) || null;
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.getReminderById] Error al buscar recordatorio #${id}:`, error);
            throw error;
        }
    }

    async listAllPendingReminders(): Promise<any[]> {
        try {
            return this.ldb.data.reminders.filter(r => r.status === 'pending');
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listAllPendingReminders] Error al listar recordatorios pendientes:', error);
            throw error;
        }
    }

    async listPendingMediaPaths(): Promise<string[]> {
        try {
            const list = this.ldb.data.reminders.filter(r => r.status !== 'sent');
            return list.map((r: any) => r.mediaPath).filter(Boolean);
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listPendingMediaPaths] Error al listar rutas multimedia:', error);
            throw error;
        }
    }

    async updateReminder(id: number, data: Partial<ReminderData>): Promise<void> {
        try {
            const r = this.ldb.data.reminders.find(rem => rem.id === id);
            if (r) {
                Object.assign(r, data);
                await this.ldb.write();
            }
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.updateReminder] Error al actualizar recordatorio en Lowdb:', error);
            throw error;
        }
    }

    async listPendingOrFailedReminders(): Promise<any[]> {
        try {
            return this.ldb.data.reminders.filter(r => ['pending', 'failed'].includes(r.status));
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listPendingOrFailedReminders] Error al listar recordatorios pendientes/fallidos:', error);
            throw error;
        }
    }

    async checkReminderExistsByMediaPath(mediaPath: string): Promise<boolean> {
        try {
            if (!mediaPath) return false;
            const targetBase = normalizeMediaBasename(mediaPath);
            if (!targetBase) return false;
            return !!this.ldb.data.reminders.find(r => {
                if (!r.mediaPath) return false;
                return normalizeMediaBasename(r.mediaPath) === targetBase;
            });
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.checkReminderExistsByMediaPath] Error al verificar multimedia ${mediaPath}:`, error);
            throw error;
        }
    }

    async listTemplates(): Promise<any[]> {
        try {
            const list = [...this.ldb.data.templates];
            return list.sort((a: any, b: any) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listTemplates] Error al listar plantillas:', error);
            throw error;
        }
    }

    async createTemplate(name: string, content: string): Promise<number> {
        const id = generateNumericId();
        try {
            this.ldb.data.templates.push({ id, name, content, timestamp: new Date() });
            await this.ldb.write();
            return id;
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.createTemplate] Error al crear plantilla en Lowdb:', error);
            throw error;
        }
    }

    async deleteTemplate(id: number): Promise<void> {
        try {
            this.ldb.data.templates = this.ldb.data.templates.filter(t => t.id !== id);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.deleteTemplate] Error al eliminar plantilla en Lowdb:', error);
            throw error;
        }
    }

    async updateTemplate(id: number, name: string, content: string): Promise<void> {
        try {
            const t = this.ldb.data.templates.find(temp => temp.id === id);
            if (t) {
                t.name = name;
                t.content = content;
                await this.ldb.write();
            }
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.updateTemplate] Error al actualizar plantilla en Lowdb:', error);
            throw error;
        }
    }

    async pauseChat(chatId: string, reason: string, durationHours: number = 6): Promise<void> {
        const pausedUntil = new Date(Date.now() + durationHours * 3600000).toISOString();
        try {
            const payload: PausedChatData = { chatId, reason, pausedUntil, timestamp: new Date() };
            const exists = this.ldb.data.paused_chats.find(p => p.chatId === chatId);
            if (exists) {
                Object.assign(exists, payload);
            } else {
                this.ldb.data.paused_chats.push(payload);
            }
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.pauseChat] Error al pausar chat en Lowdb:', error);
            throw error;
        }
    }

    async unpauseChat(chatId: string): Promise<void> {
        try {
            this.ldb.data.paused_chats = this.ldb.data.paused_chats.filter(p => p.chatId !== chatId);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.unpauseChat] Error al despausar chat en Lowdb:', error);
            throw error;
        }
    }

    async isChatPaused(chatId: string): Promise<boolean> {
        try {
            const row = this.ldb.data.paused_chats.find(p => p.chatId === chatId);
            if (!row) return false;
            
            if (new Date(row.pausedUntil) > new Date()) {
                return true;
            } else {
                this.ldb.data.paused_chats = this.ldb.data.paused_chats.filter(p => p.chatId !== chatId);
                await this.ldb.write();
                return false;
            }
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.isChatPaused] Error al verificar estado de pausa del chat ${chatId}:`, error);
            throw error;
        }
    }

    async listPausedChats(): Promise<any[]> {
        try {
            const list = [...this.ldb.data.paused_chats];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listPausedChats] Error al listar chats pausados:', error);
            throw error;
        }
    }

    async listAutoresponders(): Promise<any[]> {
        try {
            const list = [...this.ldb.data.autoresponders];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.listAutoresponders] Error al listar autorespondedores:', error);
            throw error;
        }
    }

    async createAutoresponder(
        keyword: string, matchType: string, response: string, aiAction: string,
        isActive: boolean = true, parentId: number | null = null, options: string | null = null
    ): Promise<number> {
        const id = generateNumericId();
        try {
            const payload: AutoresponderData = {
                id, keyword, matchType, response, aiAction,
                isActive: isActive ? 1 : 0, parentId: parentId || undefined, options: options || undefined, timestamp: new Date()
            };
            this.ldb.data.autoresponders.push(payload);
            await this.ldb.write();
            return id;
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.createAutoresponder] Error al crear autorespondedor en Lowdb:', error);
            throw error;
        }
    }

    async updateAutoresponder(
        id: number, keyword: string, matchType: string, response: string,
        aiAction: string, isActive: boolean, parentId: number | null = null, options: string | null = null
    ): Promise<void> {
        try {
            const ar = this.ldb.data.autoresponders.find(a => a.id === id);
            if (ar) {
                Object.assign(ar, {
                    keyword, matchType, response, aiAction,
                    isActive: isActive ? 1 : 0, parentId: parentId || undefined, options: options || undefined
                });
                await this.ldb.write();
            }
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.updateAutoresponder] Error al actualizar autorespondedor en Lowdb:', error);
            throw error;
        }
    }

    async toggleAutoresponder(id: number, isActive: boolean): Promise<void> {
        try {
            const ar = this.ldb.data.autoresponders.find(a => a.id === id);
            if (ar) {
                ar.isActive = isActive ? 1 : 0;
                await this.ldb.write();
            }
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.toggleAutoresponder] Error al alternar autorespondedor en Lowdb:', error);
            throw error;
        }
    }

    async deleteAutoresponder(id: number): Promise<void> {
        try {
            this.ldb.data.autoresponders = this.ldb.data.autoresponders.filter(a => a.id !== id);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.deleteAutoresponder] Error al eliminar autorespondedor en Lowdb:', error);
            throw error;
        }
    }

    async getUserState(chatId: string): Promise<number | null> {
        try {
            const row = this.ldb.data.user_states.find(s => s.chatId === chatId);
            return row ? (row.currentMenuId ?? null) : null;
        } catch (error) {
            console.error(`❌ [DB:LowdbAdapter.getUserState] Error al obtener estado para ${chatId}:`, error);
            throw error;
        }
    }

    async setUserState(chatId: string, currentMenuId: number | null): Promise<void> {
        try {
            if (currentMenuId === null) {
                this.ldb.data.user_states = this.ldb.data.user_states.filter(s => s.chatId !== chatId);
            } else {
                const exists = this.ldb.data.user_states.find(s => s.chatId === chatId);
                if (exists) {
                    exists.currentMenuId = currentMenuId;
                    exists.timestamp = new Date();
                } else {
                    this.ldb.data.user_states.push({ chatId, currentMenuId, timestamp: new Date() });
                }
            }
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.setUserState] Error al guardar estado en Lowdb:', error);
            throw error;
        }
    }

    getActiveEngine(): 'mongodb' | 'lowdb' | 'none' {
        return 'lowdb';
    }

    async getSheetSyncSettings(): Promise<SheetSyncSettings | null> {
        try {
            return this.ldb.data.sheet_sync_settings || null;
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.getSheetSyncSettings] Error al leer configuración de Google Sheets:', error);
            throw error;
        }
    }

    async saveSheetSyncSettings(settings: SheetSyncSettings): Promise<void> {
        try {
            this.ldb.data.sheet_sync_settings = settings;
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.saveSheetSyncSettings] Error al guardar configuracion de Google Sheets en Lowdb:', error);
            throw error;
        }
    }

    async recoverOrphanedProcessingReminders(): Promise<number> {
        try {
            const processing = (this.ldb.data.reminders || []).filter(r => r.status === 'processing');
            if (processing.length === 0) return 0;
            for (const rem of processing) {
                rem.status = 'pending';
            }
            await this.ldb.write();
            console.log(`[Scheduler] 🔄 Recuperados ${processing.length} recordatorios huérfanos de 'processing' a 'pending'.`);
            return processing.length;
        } catch (error) {
            console.error('❌ [DB:LowdbAdapter.recoverOrphanedProcessingReminders] Error al recuperar recordatorios huérfanos:', error);
            throw error;
        }
    }
}
