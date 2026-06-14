import path from 'path';
import { IDatabaseAdapter } from './db.adapter';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData, MessageRow, SheetSyncSettings
} from './interfaces';

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

function generateNumericId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
}

export class LowdbAdapter implements IDatabaseAdapter {
    private ldb!: Low<Schema>;

    async initDB(): Promise<void> {
        try {
            const dbPath = path.resolve('data/database.json');
            const adapter = new JSONFile<Schema>(dbPath);
            const defaultData: Schema = {
                users: [], settings: [], reminders: [], messages: [], 
                audits: [], templates: [], paused_chats: [], autoresponders: [], user_states: [], sheet_sync_settings: null
            };
            this.ldb = new Low<Schema>(adapter, defaultData);
            
            await this.ldb.read();
            await this.ldb.write();
            
            console.log('✅ [DB] Base de datos local Lowdb inicializada correctamente en data/database.json.');
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
                Object.assign(user, data);
            } else {
                const newUser: UserData = {
                    id, nombre: data.nombre || 'Sin Nombre',
                    xp: data.xp !== undefined ? data.xp : 0,
                    nivel: data.nivel !== undefined ? data.nivel : 1,
                    rango: data.rango || 'Novato',
                    ...data
                } as UserData;
                this.ldb.data.users.push(newUser);
                user = newUser;
            }
            await this.ldb.write();
            return user;
        } catch (error) {
            console.error(`❌ [DB] Error al guardar usuario ${id} en Lowdb:`, error);
            return null;
        }
    }

    async getUser(id: string): Promise<UserData | null> {
        try {
            const user = this.ldb.data.users.find(u => u.id === id);
            return user || null;
        } catch (error) {
            console.error(`❌ [DB] Error al obtener usuario ${id} de Lowdb:`, error);
            return null;
        }
    }

    async getSettings(): Promise<Record<string, string>> {
        const defaultSettings: Record<string, string> = {
            bot_name: "GravityBot",
            system_prompt: "Eres un asistente inteligente y servicial. Responde de forma amable y profesional.",
            possible_responses: "1. Si preguntan precio: Dile que consulte la web.\\n2. Si saludan: Saluda cordialmente.",
            AI_ENABLED: "true"
        };
        try {
            const rows = this.ldb.data.settings || [];
            const loaded = rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
            return { ...defaultSettings, ...loaded };
        } catch (error) {
            return defaultSettings;
        }
    }

    async updateSettings(settings: Record<string, string>): Promise<void> {
        try {
            Object.entries(settings).forEach(([key, value]) => {
                const exists = this.ldb.data.settings.find(s => s.key === key);
                if (exists) {
                    exists.value = value;
                } else {
                    this.ldb.data.settings.push({ key, value });
                }
            });
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar configuraciones en Lowdb:', error);
        }
    }

    async addMessage(userId: string, role: string, content: string): Promise<void> {
        try {
            this.ldb.data.messages.push({ userId, role, content, timestamp: new Date() });
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al guardar mensaje en Lowdb:', error);
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
            return [];
        }
    }

    async clearHistory(userId: string): Promise<void> {
        try {
            this.ldb.data.messages = this.ldb.data.messages.filter(m => m.userId !== userId);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al vaciar historial en Lowdb:', error);
        }
    }

    async logAudit(userId: string, action: string, details: any): Promise<void> {
        const detailsStr = JSON.stringify(details);
        try {
            this.ldb.data.audits.push({ userId, action, details: detailsStr, timestamp: new Date() });
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al registrar auditoría en Lowdb:', error);
        }
        console.log(`[Audit Logged] ${action} for user ${userId}`);
    }

    async listAudits(limit: number = 10): Promise<any[]> {
        try {
            const list = [...this.ldb.data.audits];
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
            this.ldb.data.reminders.push(payload);
            await this.ldb.write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear recordatorio en Lowdb:', error);
            return id;
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
            return [];
        }
    }

    async deleteReminder(id: number): Promise<void> {
        try {
            this.ldb.data.reminders = this.ldb.data.reminders.filter(r => r.id !== id);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar recordatorio en Lowdb:', error);
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
            console.error('❌ [DB] Error al actualizar estado de recordatorio en Lowdb:', error);
        }
    }

    async deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent'): Promise<void> {
        try {
            this.ldb.data.reminders = this.ldb.data.reminders.filter(r => {
                if (r.userId !== userId) return true; // keep others
                if (type === 'pending' && r.status === 'sent') return true; // keep sent
                if (type === 'sent' && r.status !== 'sent') return true; // keep pending
                return false; // delete
            });
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error en eliminación masiva en Lowdb:', error);
        }
    }

    async getReminderById(id: number): Promise<any | null> {
        try {
            return this.ldb.data.reminders.find(r => r.id === id) || null;
        } catch (error) {
            return null;
        }
    }

    async listAllPendingReminders(): Promise<any[]> {
        try {
            return this.ldb.data.reminders.filter(r => r.status === 'pending');
        } catch (error) {
            return [];
        }
    }

    async listPendingMediaPaths(): Promise<string[]> {
        try {
            const list = this.ldb.data.reminders.filter(r => r.status === 'pending');
            return list.map((r: any) => r.mediaPath).filter(Boolean);
        } catch (error) {
            return [];
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
            console.error('❌ [DB] Error al actualizar recordatorio en Lowdb:', error);
        }
    }

    async listPendingOrFailedReminders(): Promise<any[]> {
        try {
            return this.ldb.data.reminders.filter(r => ['pending', 'failed'].includes(r.status));
        } catch (error) {
            return [];
        }
    }

    async checkReminderExistsByMediaPath(mediaPath: string): Promise<boolean> {
        try {
            return !!this.ldb.data.reminders.find(r => r.mediaPath === mediaPath);
        } catch (error) {
            return false;
        }
    }

    async listTemplates(): Promise<any[]> {
        try {
            const list = [...this.ldb.data.templates];
            return list.sort((a: any, b: any) => a.name.localeCompare(b.name));
        } catch (error) {
            return [];
        }
    }

    async createTemplate(name: string, content: string): Promise<number> {
        const id = generateNumericId();
        try {
            this.ldb.data.templates.push({ id, name, content, timestamp: new Date() });
            await this.ldb.write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear plantilla en Lowdb:', error);
            return id;
        }
    }

    async deleteTemplate(id: number): Promise<void> {
        try {
            this.ldb.data.templates = this.ldb.data.templates.filter(t => t.id !== id);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar plantilla en Lowdb:', error);
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
            console.error('❌ [DB] Error al actualizar plantilla en Lowdb:', error);
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
            console.error('❌ [DB] Error al pausar chat en Lowdb:', error);
        }
    }

    async unpauseChat(chatId: string): Promise<void> {
        try {
            this.ldb.data.paused_chats = this.ldb.data.paused_chats.filter(p => p.chatId !== chatId);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al despausar chat en Lowdb:', error);
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
            return false;
        }
    }

    async listPausedChats(): Promise<any[]> {
        try {
            const list = [...this.ldb.data.paused_chats];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            return [];
        }
    }

    async listAutoresponders(): Promise<any[]> {
        try {
            const list = [...this.ldb.data.autoresponders];
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
            this.ldb.data.autoresponders.push(payload);
            await this.ldb.write();
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
            const ar = this.ldb.data.autoresponders.find(a => a.id === id);
            if (ar) {
                Object.assign(ar, {
                    keyword, matchType, response, aiAction,
                    isActive: isActive ? 1 : 0, parentId: parentId || undefined, options: options || undefined
                });
                await this.ldb.write();
            }
        } catch (error) {
            console.error('❌ [DB] Error al actualizar autorespondedor en Lowdb:', error);
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
            console.error('❌ [DB] Error al alternar autorespondedor en Lowdb:', error);
        }
    }

    async deleteAutoresponder(id: number): Promise<void> {
        try {
            this.ldb.data.autoresponders = this.ldb.data.autoresponders.filter(a => a.id !== id);
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar autorespondedor en Lowdb:', error);
        }
    }

    async getUserState(chatId: string): Promise<number | null> {
        try {
            const row = this.ldb.data.user_states.find(s => s.chatId === chatId);
            return row ? (row.currentMenuId ?? null) : null;
        } catch (error) {
            return null;
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
            console.error('❌ [DB] Error al guardar estado en Lowdb:', error);
        }
    }

    getActiveEngine(): 'mongodb' | 'lowdb' | 'none' {
        return 'lowdb';
    }

    async getSheetSyncSettings(): Promise<SheetSyncSettings | null> {
        try {
            return this.ldb.data.sheet_sync_settings || null;
        } catch (error) {
            return null;
        }
    }

    async saveSheetSyncSettings(settings: SheetSyncSettings): Promise<void> {
        try {
            this.ldb.data.sheet_sync_settings = settings;
            await this.ldb.write();
        } catch (error) {
            console.error('❌ [DB] Error al guardar configuracion de Google Sheets en Lowdb:', error);
        }
    }
}
