import path from 'path';
import { IDatabaseAdapter } from './db.adapter';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData, MessageRow 
} from './interfaces';

// lowdb v1 is CommonJS
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

function generateNumericId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
}

export class LowdbAdapter implements IDatabaseAdapter {
    private ldb: any = null;

    async initDB(): Promise<void> {
        try {
            const dbPath = path.resolve('data/database.json');
            const adapter = new FileSync(dbPath);
            this.ldb = low(adapter);
            
            this.ldb.defaults({
                users: [], settings: [], reminders: [], messages: [], 
                audits: [], templates: [], paused_chats: [], autoresponders: [], user_states: []
            }).write();
            
            console.log('✅ [DB] Base de datos local Lowdb inicializada correctamente en data/database.json.');
        } catch (err) {
            console.error('❌ [DB] Error crítico al inicializar Lowdb:', err);
            throw err;
        }
    }

    // Expose the raw lowdb instance for the migrator
    getRawDb() {
        return this.ldb;
    }

    async saveUser(id: string, data: Partial<UserData>): Promise<UserData | null> {
        try {
            const user = this.ldb.get('users').find({ id }).value();
            if (user) {
                this.ldb.get('users').find({ id }).assign(data).write();
            } else {
                const newUser: UserData = {
                    id, nombre: data.nombre || 'Sin Nombre',
                    xp: data.xp !== undefined ? data.xp : 0,
                    nivel: data.nivel !== undefined ? data.nivel : 1,
                    rango: data.rango || 'Novato',
                    ...data
                };
                this.ldb.get('users').push(newUser).write();
            }
            return this.ldb.get('users').find({ id }).value() as UserData;
        } catch (error) {
            console.error(`❌ [DB] Error al guardar usuario ${id} en Lowdb:`, error);
            return null;
        }
    }

    async getUser(id: string): Promise<UserData | null> {
        try {
            const user = this.ldb.get('users').find({ id }).value();
            return (user as UserData) || null;
        } catch (error) {
            console.error(`❌ [DB] Error al obtener usuario ${id} de Lowdb:`, error);
            return null;
        }
    }

    async getSettings(): Promise<Record<string, string>> {
        const defaultSettings: Record<string, string> = {
            bot_name: "GravityBot",
            system_prompt: "Eres un asistente inteligente y servicial. Responde de forma amable y profesional.",
            possible_responses: "1. Si preguntan precio: Dile que consulte la web.\n2. Si saludan: Saluda cordialmente.",
            AI_ENABLED: "true"
        };
        try {
            const rows = this.ldb.get('settings').value() || [];
            const loaded = rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
            return { ...defaultSettings, ...loaded };
        } catch (error) {
            return defaultSettings;
        }
    }

    async updateSettings(settings: Record<string, string>): Promise<void> {
        try {
            Object.entries(settings).forEach(([key, value]) => {
                const exists = this.ldb.get('settings').find({ key }).value();
                if (exists) {
                    this.ldb.get('settings').find({ key }).assign({ value }).write();
                } else {
                    this.ldb.get('settings').push({ key, value }).write();
                }
            });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar configuraciones en Lowdb:', error);
        }
    }

    async addMessage(userId: string, role: string, content: string): Promise<void> {
        try {
            this.ldb.get('messages').push({ userId, role, content, timestamp: new Date() }).write();
        } catch (error) {
            console.error('❌ [DB] Error al guardar mensaje en Lowdb:', error);
        }
    }

    async getHistory(userId: string, limit: number = 50): Promise<MessageRow[]> {
        try {
            const all = this.ldb.get('messages').filter({ userId }).value() || [];
            const sorted = all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const sliced = sorted.slice(0, limit);
            return sliced.reverse().map((row: any) => ({
                role: row.role as any, content: row.content
            }));
        } catch (error) {
            return [];
        }
    }

    async clearHistory(userId: string): Promise<void> {
        try {
            this.ldb.get('messages').remove({ userId }).write();
        } catch (error) {
            console.error('❌ [DB] Error al vaciar historial en Lowdb:', error);
        }
    }

    async logAudit(userId: string, action: string, details: any): Promise<void> {
        const detailsStr = JSON.stringify(details);
        try {
            this.ldb.get('audits').push({ userId, action, details: detailsStr, timestamp: new Date() }).write();
        } catch (error) {
            console.error('❌ [DB] Error al registrar auditoría en Lowdb:', error);
        }
        console.log(`[Audit Logged] ${action} for user ${userId}`);
    }

    async listAudits(limit: number = 10): Promise<any[]> {
        try {
            const list = this.ldb.get('audits').value() || [];
            const sorted = list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return sorted.slice(0, limit);
        } catch (error) {
            console.error('❌ [DB] Error al obtener auditorias en Lowdb:', error);
            return [];
        }
    }

    async createReminder(
        userId: string, chatId: string, text: string, time: string,
        mediaPath?: string, mediaType?: string, repeat: string = 'none',
        repeatInterval?: number, repeatUnit?: string, title?: string,
        status: 'pending' | 'processing' | 'sent' | 'failed' = 'pending'
    ): Promise<number> {
        const id = generateNumericId();
        const payload: ReminderData = {
            id, userId, chatId, title, text, time, mediaPath, mediaType,
            status, repeat, repeatInterval, repeatUnit, timestamp: new Date()
        };
        try {
            this.ldb.get('reminders').push(payload).write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear recordatorio en Lowdb:', error);
            return id;
        }
    }

    async listReminders(userId: string, includeProcessed: boolean = false): Promise<any[]> {
        try {
            let list = this.ldb.get('reminders').filter({ userId }).value() || [];
            if (!includeProcessed) {
                list = list.filter((r: any) => r.status === 'pending');
            }
            if (includeProcessed) {
                return list.sort((a: any, b: any) => b.time.localeCompare(a.time) || b.id - a.id);
            } else {
                return list.sort((a: any, b: any) => a.time.localeCompare(b.time) || a.id - b.id);
            }
        } catch (error) {
            return [];
        }
    }

    async deleteReminder(id: number): Promise<void> {
        try {
            this.ldb.get('reminders').remove({ id }).write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar recordatorio en Lowdb:', error);
        }
    }

    async updateReminderStatus(id: number, status: 'pending' | 'processing' | 'sent' | 'failed'): Promise<void> {
        try {
            this.ldb.get('reminders').find({ id }).assign({ status }).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar estado de recordatorio en Lowdb:', error);
        }
    }

    async deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent'): Promise<void> {
        try {
            let filterFn = (r: any) => r.userId === userId;
            if (type === 'pending') filterFn = (r: any) => r.userId === userId && r.status !== 'sent';
            else if (type === 'sent') filterFn = (r: any) => r.userId === userId && r.status === 'sent';
            this.ldb.get('reminders').remove(filterFn).write();
        } catch (error) {
            console.error('❌ [DB] Error en eliminación masiva en Lowdb:', error);
        }
    }

    async getReminderById(id: number): Promise<any | null> {
        try {
            return this.ldb.get('reminders').find({ id }).value() || null;
        } catch (error) {
            return null;
        }
    }

    async listAllPendingReminders(): Promise<any[]> {
        try {
            return this.ldb.get('reminders').filter({ status: 'pending' }).value() || [];
        } catch (error) {
            return [];
        }
    }

    async listPendingMediaPaths(): Promise<string[]> {
        try {
            const list = this.ldb.get('reminders').filter({ status: 'pending' }).value() || [];
            return list.map((r: any) => r.mediaPath).filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    async updateReminder(id: number, data: Partial<ReminderData>): Promise<void> {
        try {
            this.ldb.get('reminders').find({ id }).assign(data).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar recordatorio en Lowdb:', error);
        }
    }

    async listPendingOrFailedReminders(): Promise<any[]> {
        try {
            const list = this.ldb.get('reminders').value() || [];
            return list.filter((r: any) => ['pending', 'failed'].includes(r.status));
        } catch (error) {
            return [];
        }
    }

    async checkReminderExistsByMediaPath(mediaPath: string): Promise<boolean> {
        try {
            const exists = this.ldb.get('reminders').find({ mediaPath }).value();
            return !!exists;
        } catch (error) {
            return false;
        }
    }

    async listTemplates(): Promise<any[]> {
        try {
            const list = this.ldb.get('templates').value() || [];
            return list.sort((a: any, b: any) => a.name.localeCompare(b.name));
        } catch (error) {
            return [];
        }
    }

    async createTemplate(name: string, content: string): Promise<number> {
        const id = generateNumericId();
        try {
            this.ldb.get('templates').push({ id, name, content, timestamp: new Date() }).write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear plantilla en Lowdb:', error);
            return id;
        }
    }

    async deleteTemplate(id: number): Promise<void> {
        try {
            this.ldb.get('templates').remove({ id }).write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar plantilla en Lowdb:', error);
        }
    }

    async updateTemplate(id: number, name: string, content: string): Promise<void> {
        try {
            this.ldb.get('templates').find({ id }).assign({ name, content }).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar plantilla en Lowdb:', error);
        }
    }

    async pauseChat(chatId: string, reason: string, durationHours: number = 6): Promise<void> {
        const pausedUntil = new Date(Date.now() + durationHours * 3600000).toISOString();
        try {
            const payload: PausedChatData = { chatId, reason, pausedUntil, timestamp: new Date() };
            const exists = this.ldb.get('paused_chats').find({ chatId }).value();
            if (exists) {
                this.ldb.get('paused_chats').find({ chatId }).assign(payload).write();
            } else {
                this.ldb.get('paused_chats').push(payload).write();
            }
        } catch (error) {
            console.error('❌ [DB] Error al pausar chat en Lowdb:', error);
        }
    }

    async unpauseChat(chatId: string): Promise<void> {
        try {
            this.ldb.get('paused_chats').remove({ chatId }).write();
        } catch (error) {
            console.error('❌ [DB] Error al despausar chat en Lowdb:', error);
        }
    }

    async isChatPaused(chatId: string): Promise<boolean> {
        try {
            const row = this.ldb.get('paused_chats').find({ chatId }).value();
            if (!row) return false;
            
            if (new Date(row.pausedUntil) > new Date()) {
                return true;
            } else {
                this.ldb.get('paused_chats').remove({ chatId }).write();
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async listPausedChats(): Promise<any[]> {
        try {
            const list = this.ldb.get('paused_chats').value() || [];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            return [];
        }
    }

    async listAutoresponders(): Promise<any[]> {
        try {
            const list = this.ldb.get('autoresponders').value() || [];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            return [];
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
            this.ldb.get('autoresponders').push(payload).write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear autorespondedor en Lowdb:', error);
            return id;
        }
    }

    async updateAutoresponder(
        id: number, keyword: string, matchType: string, response: string,
        aiAction: string, isActive: boolean, parentId: number | null = null, options: string | null = null
    ): Promise<void> {
        try {
            this.ldb.get('autoresponders').find({ id }).assign({
                keyword, matchType, response, aiAction,
                isActive: isActive ? 1 : 0, parentId: parentId || undefined, options: options || undefined
            }).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar autorespondedor en Lowdb:', error);
        }
    }

    async toggleAutoresponder(id: number, isActive: boolean): Promise<void> {
        try {
            this.ldb.get('autoresponders').find({ id }).assign({ isActive: isActive ? 1 : 0 }).write();
        } catch (error) {
            console.error('❌ [DB] Error al alternar autorespondedor en Lowdb:', error);
        }
    }

    async deleteAutoresponder(id: number): Promise<void> {
        try {
            this.ldb.get('autoresponders').remove({ id }).write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar autorespondedor en Lowdb:', error);
        }
    }

    async getUserState(chatId: string): Promise<number | null> {
        try {
            const row = this.ldb.get('user_states').find({ chatId }).value();
            return row ? (row.currentMenuId ?? null) : null;
        } catch (error) {
            return null;
        }
    }

    async setUserState(chatId: string, currentMenuId: number | null): Promise<void> {
        try {
            if (currentMenuId === null) {
                this.ldb.get('user_states').remove({ chatId }).write();
            } else {
                const exists = this.ldb.get('user_states').find({ chatId }).value();
                if (exists) {
                    this.ldb.get('user_states').find({ chatId }).assign({ currentMenuId, timestamp: new Date() }).write();
                } else {
                    this.ldb.get('user_states').push({ chatId, currentMenuId, timestamp: new Date() }).write();
                }
            }
        } catch (error) {
            console.error('❌ [DB] Error al guardar estado en Lowdb:', error);
        }
    }

    getActiveEngine(): 'mongodb' | 'lowdb' | 'none' {
        return 'lowdb';
    }
}
