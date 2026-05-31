import mongoose from 'mongoose';
import path from 'path';

// lowdb v1 is a CommonJS module and lack native TS types. Using require() prevents compiler errors.
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

export let isMongo = false;
export let ldb: any = null;

// Helper to generate unique integer IDs for reminders, templates, etc.
export function generateNumericId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// ==========================================
// 1. INTERFACES DEFINITIONS
// ==========================================

export interface UserData {
    id: string;
    nombre: string;
    xp: number;
    nivel: number;
    rango: string;
}

export interface SettingsData {
    key: string;
    value: string;
}

export interface MessageData {
    userId: string;
    role: string;
    content: string;
    timestamp: Date;
}

export interface AuditData {
    userId: string;
    action: string;
    details: string; // JSON string
    timestamp: Date;
}

export interface ReminderData {
    id: number;
    userId: string;
    chatId: string;
    title?: string;
    text: string;
    time: string;
    mediaPath?: string;
    mediaType?: string;
    status: 'pending' | 'processing' | 'sent' | 'failed';
    repeat: string;
    repeatInterval?: number;
    repeatUnit?: string;
    timestamp: Date;
}

export interface TemplateData {
    id: number;
    name: string;
    content: string;
    timestamp: Date;
}

export interface PausedChatData {
    chatId: string;
    reason: string;
    pausedUntil: string;
    timestamp: Date;
}

export interface AutoresponderData {
    id: number;
    keyword: string;
    matchType: string;
    response: string;
    aiAction: string;
    isActive: number; // 1 = true, 0 = false
    parentId?: number;
    options?: string;
    timestamp: Date;
}

export interface UserStateData {
    chatId: string;
    currentMenuId?: number;
    timestamp: Date;
}

// ==========================================
// 2. MONGOOSE MODELS DEFINITIONS
// ==========================================

const UserSchema = new mongoose.Schema<UserData>({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    xp: { type: Number, default: 0 },
    nivel: { type: Number, default: 1 },
    rango: { type: String, default: 'Novato' }
});
export const UserModel = mongoose.models.User || mongoose.model<UserData>('User', UserSchema);

const SettingsSchema = new mongoose.Schema<SettingsData>({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});
export const SettingsModel = mongoose.models.Settings || mongoose.model<SettingsData>('Settings', SettingsSchema);

const MessageSchema = new mongoose.Schema<MessageData>({
    userId: { type: String, required: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
export const MessageModel = mongoose.models.Message || mongoose.model<MessageData>('Message', MessageSchema);

const AuditSchema = new mongoose.Schema<AuditData>({
    userId: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
export const AuditModel = mongoose.models.Audit || mongoose.model<AuditData>('Audit', AuditSchema);

const ReminderSchema = new mongoose.Schema<ReminderData>({
    id: { type: Number, required: true, unique: true },
    userId: { type: String, required: true },
    chatId: { type: String, required: true },
    title: { type: String },
    text: { type: String, required: true },
    time: { type: String, required: true },
    mediaPath: { type: String },
    mediaType: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending' },
    repeat: { type: String, default: 'none' },
    repeatInterval: { type: Number },
    repeatUnit: { type: String },
    timestamp: { type: Date, default: Date.now }
});
export const ReminderModel = mongoose.models.Reminder || mongoose.model<ReminderData>('Reminder', ReminderSchema);

const TemplateSchema = new mongoose.Schema<TemplateData>({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
export const TemplateModel = mongoose.models.Template || mongoose.model<TemplateData>('Template', TemplateSchema);

const PausedChatSchema = new mongoose.Schema<PausedChatData>({
    chatId: { type: String, required: true, unique: true },
    reason: { type: String, required: true },
    pausedUntil: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
export const PausedChatModel = mongoose.models.PausedChat || mongoose.model<PausedChatData>('PausedChat', PausedChatSchema);

const AutoresponderSchema = new mongoose.Schema<AutoresponderData>({
    id: { type: Number, required: true, unique: true },
    keyword: { type: String, required: true },
    matchType: { type: String, required: true },
    response: { type: String, required: true },
    aiAction: { type: String, required: true },
    isActive: { type: Number, default: 1 },
    parentId: { type: Number },
    options: { type: String },
    timestamp: { type: Date, default: Date.now }
});
export const AutoresponderModel = mongoose.models.Autoresponder || mongoose.model<AutoresponderData>('Autoresponder', AutoresponderSchema);

const UserStateSchema = new mongoose.Schema<UserStateData>({
    chatId: { type: String, required: true, unique: true },
    currentMenuId: { type: Number },
    timestamp: { type: Date, default: Date.now }
});
export const UserStateModel = mongoose.models.UserState || mongoose.model<UserStateData>('UserState', UserStateSchema);

// ==========================================
// 3. INITIALIZER
// ==========================================

export async function initDB(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri && mongoUri !== 'tu_url_de_atlas_aqui') {
        try {
            console.log('[DB] Intentando conectar a MongoDB Atlas...');
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000
            });
            isMongo = true;
            console.log('✅ [DB] Conectado exitosamente a MongoDB Atlas.');
            
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
        const dbPath = path.resolve('data/database.json');
        const adapter = new FileSync(dbPath);
        ldb = low(adapter);
        
        ldb.defaults({
            users: [],
            settings: [],
            reminders: [],
            messages: [],
            audits: [],
            templates: [],
            paused_chats: [],
            autoresponders: [],
            user_states: []
        }).write();
        
        isMongo = false;
        console.log('✅ [DB] Base de datos local Lowdb inicializada correctamente en data/database.json.');
        
        // Execute automigrator
        const { runMigration } = require('./migrator');
        await runMigration();
    } catch (err) {
        console.error('❌ [DB] Error crítico al inicializar Lowdb:', err);
    }
}

// ==========================================
// 4. USER PERFILES CRUD (XP & LEVELS)
// ==========================================

export async function saveUser(id: string, data: Partial<UserData>): Promise<UserData | null> {
    if (isMongo) {
        try {
            const updated = await UserModel.findOneAndUpdate(
                { id },
                { $set: data },
                { upsert: true, new: true }
            ).lean();
            return updated as UserData | null;
        } catch (error) {
            console.error(`❌ [DB] Error al guardar usuario ${id} en MongoDB:`, error);
            return null;
        }
    } else {
        try {
            const user = ldb.get('users').find({ id }).value();
            if (user) {
                ldb.get('users').find({ id }).assign(data).write();
            } else {
                const newUser: UserData = {
                    id,
                    nombre: data.nombre || 'Sin Nombre',
                    xp: data.xp !== undefined ? data.xp : 0,
                    nivel: data.nivel !== undefined ? data.nivel : 1,
                    rango: data.rango || 'Novato',
                    ...data
                };
                ldb.get('users').push(newUser).write();
            }
            return ldb.get('users').find({ id }).value() as UserData;
        } catch (error) {
            console.error(`❌ [DB] Error al guardar usuario ${id} en Lowdb:`, error);
            return null;
        }
    }
}

export async function getUser(id: string): Promise<UserData | null> {
    if (isMongo) {
        try {
            const user = await UserModel.findOne({ id }).lean();
            return user as UserData | null;
        } catch (error) {
            console.error(`❌ [DB] Error al obtener usuario ${id} de MongoDB:`, error);
            return null;
        }
    } else {
        try {
            const user = ldb.get('users').find({ id }).value();
            return (user as UserData) || null;
        } catch (error) {
            console.error(`❌ [DB] Error al obtener usuario ${id} de Lowdb:`, error);
            return null;
        }
    }
}

// ==========================================
// 5. SETTINGS CRUD
// ==========================================

export async function getSettings(): Promise<Record<string, string>> {
    const defaultSettings: Record<string, string> = {
        bot_name: "GravityBot",
        system_prompt: "Eres un asistente inteligente y servicial. Responde de forma amable y profesional.",
        possible_responses: "1. Si preguntan precio: Dile que consulte la web.\n2. Si saludan: Saluda cordialmente.",
        AI_ENABLED: "true"
    };

    if (isMongo) {
        try {
            const rows = await SettingsModel.find().lean() as SettingsData[];
            const loaded = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
            return { ...defaultSettings, ...loaded };
        } catch (error) {
            console.error('❌ [DB] Error al obtener configuraciones en MongoDB:', error);
            return defaultSettings;
        }
    } else {
        try {
            const rows = ldb.get('settings').value() || [];
            const loaded = rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
            return { ...defaultSettings, ...loaded };
        } catch (error) {
            return defaultSettings;
        }
    }
}

export async function updateSettings(settings: Record<string, string>): Promise<void> {
    if (isMongo) {
        try {
            const operations = Object.entries(settings).map(([key, value]) => ({
                updateOne: {
                    filter: { key },
                    update: { $set: { value } },
                    upsert: true
                }
            }));
            await SettingsModel.bulkWrite(operations);
        } catch (error) {
            console.error('❌ [DB] Error al actualizar configuraciones en MongoDB:', error);
        }
    } else {
        try {
            Object.entries(settings).forEach(([key, value]) => {
                const exists = ldb.get('settings').find({ key }).value();
                if (exists) {
                    ldb.get('settings').find({ key }).assign({ value }).write();
                } else {
                    ldb.get('settings').push({ key, value }).write();
                }
            });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar configuraciones en Lowdb:', error);
        }
    }
}

// ==========================================
// 6. CHAT HISTORY (MESSAGES) CRUD
// ==========================================

export async function addMessage(userId: string, role: string, content: string): Promise<void> {
    if (isMongo) {
        try {
            const msg = new MessageModel({ userId, role, content });
            await msg.save();
        } catch (error) {
            console.error('❌ [DB] Error al guardar mensaje en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('messages').push({ userId, role, content, timestamp: new Date() }).write();
        } catch (error) {
            console.error('❌ [DB] Error al guardar mensaje en Lowdb:', error);
        }
    }
}

export interface MessageRow {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
}

export async function getHistory(userId: string, limit: number = 50): Promise<MessageRow[]> {
    if (isMongo) {
        try {
            const rows = await MessageModel.find({ userId })
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean() as MessageData[];
            return rows.reverse().map(row => ({
                role: row.role as any,
                content: row.content
            }));
        } catch (error) {
            console.error('❌ [DB] Error al leer historial en MongoDB:', error);
            return [];
        }
    } else {
        try {
            const all = ldb.get('messages').filter({ userId }).value() || [];
            // Sort by timestamp desc and slice
            const sorted = all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const sliced = sorted.slice(0, limit);
            return sliced.reverse().map((row: any) => ({
                role: row.role as any,
                content: row.content
            }));
        } catch (error) {
            return [];
        }
    }
}

export async function clearHistory(userId: string): Promise<void> {
    if (isMongo) {
        try {
            await MessageModel.deleteMany({ userId });
        } catch (error) {
            console.error('❌ [DB] Error al vaciar historial en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('messages').remove({ userId }).write();
        } catch (error) {
            console.error('❌ [DB] Error al vaciar historial en Lowdb:', error);
        }
    }
}

// ==========================================
// 7. AUDITS LOGGING CRUD
// ==========================================

export async function logAudit(userId: string, action: string, details: any): Promise<void> {
    const detailsStr = JSON.stringify(details);
    if (isMongo) {
        try {
            const audit = new AuditModel({ userId, action, details: detailsStr });
            await audit.save();
        } catch (error) {
            console.error('❌ [DB] Error al registrar auditoría en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('audits').push({ userId, action, details: detailsStr, timestamp: new Date() }).write();
        } catch (error) {
            console.error('❌ [DB] Error al registrar auditoría en Lowdb:', error);
        }
    }
    console.log(`[Audit Logged] ${action} for user ${userId}`);
}

export async function listAudits(limit: number = 10): Promise<any[]> {
    if (isMongo) {
        try {
            return await AuditModel.find().sort({ timestamp: -1 }).limit(limit).lean();
        } catch (error) {
            console.error('❌ [DB] Error al obtener auditorias en MongoDB:', error);
            return [];
        }
    } else {
        try {
            const list = ldb.get('audits').value() || [];
            const sorted = list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return sorted.slice(0, limit);
        } catch (error) {
            console.error('❌ [DB] Error al obtener auditorias en Lowdb:', error);
            return [];
        }
    }
}

// ==========================================
// 8. REMINDERS AND CAMPAIGNS CRUD
// ==========================================

export async function createReminder(
    userId: string,
    chatId: string,
    text: string,
    time: string,
    mediaPath?: string,
    mediaType?: string,
    repeat: string = 'none',
    repeatInterval?: number,
    repeatUnit?: string,
    title?: string,
    status: 'pending' | 'processing' | 'sent' | 'failed' = 'pending'
): Promise<number> {
    const id = generateNumericId();
    const payload: ReminderData = {
        id,
        userId,
        chatId,
        title: title || undefined,
        text,
        time,
        mediaPath: mediaPath || undefined,
        mediaType: mediaType || undefined,
        status,
        repeat,
        repeatInterval: repeatInterval || undefined,
        repeatUnit: repeatUnit || undefined,
        timestamp: new Date()
    };

    if (isMongo) {
        try {
            const rem = new ReminderModel(payload);
            await rem.save();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear recordatorio en MongoDB:', error);
            return id;
        }
    } else {
        try {
            ldb.get('reminders').push(payload).write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear recordatorio en Lowdb:', error);
            return id;
        }
    }
}

export async function listReminders(userId: string, includeProcessed: boolean = false): Promise<any[]> {
    if (isMongo) {
        try {
            const filter = includeProcessed 
                ? { userId } 
                : { userId, status: 'pending' };
            const sortOrder = includeProcessed ? { time: -1, id: -1 } : { time: 1, id: 1 };
            return await ReminderModel.find(filter).sort(sortOrder as any).lean();
        } catch (error) {
            console.error('❌ [DB] Error al listar recordatorios en MongoDB:', error);
            return [];
        }
    } else {
        try {
            let list = ldb.get('reminders').filter({ userId }).value() || [];
            if (!includeProcessed) {
                list = list.filter((r: any) => r.status === 'pending');
            }
            // Sort
            if (includeProcessed) {
                return list.sort((a: any, b: any) => b.time.localeCompare(a.time) || b.id - a.id);
            } else {
                return list.sort((a: any, b: any) => a.time.localeCompare(b.time) || a.id - b.id);
            }
        } catch (error) {
            return [];
        }
    }
}

export async function deleteReminder(id: number): Promise<void> {
    if (isMongo) {
        try {
            await ReminderModel.deleteOne({ id });
        } catch (error) {
            console.error('❌ [DB] Error al eliminar recordatorio en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('reminders').remove({ id }).write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar recordatorio en Lowdb:', error);
        }
    }
}

export async function updateReminderStatus(id: number, status: 'pending' | 'processing' | 'sent' | 'failed'): Promise<void> {
    if (isMongo) {
        try {
            await ReminderModel.updateOne({ id }, { $set: { status } });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar estado de recordatorio en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('reminders').find({ id }).assign({ status }).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar estado de recordatorio en Lowdb:', error);
        }
    }
}

export async function deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent'): Promise<void> {
    if (isMongo) {
        try {
            let filter: any = { userId };
            if (type === 'pending') {
                filter.status = { $ne: 'sent' };
            } else if (type === 'sent') {
                filter.status = 'sent';
            }
            await ReminderModel.deleteMany(filter);
        } catch (error) {
            console.error('❌ [DB] Error en eliminación masiva en MongoDB:', error);
        }
    } else {
        try {
            let filterFn = (r: any) => r.userId === userId;
            if (type === 'pending') {
                filterFn = (r: any) => r.userId === userId && r.status !== 'sent';
            } else if (type === 'sent') {
                filterFn = (r: any) => r.userId === userId && r.status === 'sent';
            }
            ldb.get('reminders').remove(filterFn).write();
        } catch (error) {
            console.error('❌ [DB] Error en eliminación masiva en Lowdb:', error);
        }
    }
}

export async function getReminderById(id: number): Promise<any | null> {
    if (isMongo) {
        try {
            return await ReminderModel.findOne({ id }).lean();
        } catch (error) {
            return null;
        }
    } else {
        try {
            return ldb.get('reminders').find({ id }).value() || null;
        } catch (error) {
            return null;
        }
    }
}

export async function listAllPendingReminders(): Promise<any[]> {
    if (isMongo) {
        try {
            return await ReminderModel.find({ status: 'pending' }).lean();
        } catch (error) {
            return [];
        }
    } else {
        try {
            return ldb.get('reminders').filter({ status: 'pending' }).value() || [];
        } catch (error) {
            return [];
        }
    }
}

export async function listPendingMediaPaths(): Promise<string[]> {
    if (isMongo) {
        try {
            const results = await ReminderModel.find(
                { status: 'pending', mediaPath: { $exists: true, $ne: null } },
                { mediaPath: 1 }
            ).lean();
            return results.map(r => r.mediaPath).filter(Boolean) as string[];
        } catch (error) {
            return [];
        }
    } else {
        try {
            const list = ldb.get('reminders').filter({ status: 'pending' }).value() || [];
            return list.map((r: any) => r.mediaPath).filter(Boolean);
        } catch (error) {
            return [];
        }
    }
}

export async function updateReminder(id: number, data: Partial<ReminderData>): Promise<void> {
    if (isMongo) {
        try {
            await ReminderModel.updateOne({ id }, { $set: data });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar recordatorio en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('reminders').find({ id }).assign(data).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar recordatorio en Lowdb:', error);
        }
    }
}

export async function listPendingOrFailedReminders(): Promise<any[]> {
    if (isMongo) {
        try {
            return await ReminderModel.find({ status: { $in: ['pending', 'failed'] } }).lean();
        } catch (error) {
            return [];
        }
    } else {
        try {
            const list = ldb.get('reminders').value() || [];
            return list.filter((r: any) => ['pending', 'failed'].includes(r.status));
        } catch (error) {
            return [];
        }
    }
}

export async function checkReminderExistsByMediaPath(mediaPath: string): Promise<boolean> {
    if (isMongo) {
        try {
            const exists = await ReminderModel.findOne({ mediaPath }).lean();
            return !!exists;
        } catch (error) {
            return false;
        }
    } else {
        try {
            const exists = ldb.get('reminders').find({ mediaPath }).value();
            return !!exists;
        } catch (error) {
            return false;
        }
    }
}

// ==========================================
// 9. TEMPLATES CRUD
// ==========================================

export async function listTemplates(): Promise<any[]> {
    if (isMongo) {
        try {
            return await TemplateModel.find().sort({ name: 1 }).lean();
        } catch (error) {
            return [];
        }
    } else {
        try {
            const list = ldb.get('templates').value() || [];
            return list.sort((a: any, b: any) => a.name.localeCompare(b.name));
        } catch (error) {
            return [];
        }
    }
}

export async function createTemplate(name: string, content: string): Promise<number> {
    const id = generateNumericId();
    const payload: TemplateData = { id, name, content, timestamp: new Date() };

    if (isMongo) {
        try {
            const temp = new TemplateModel(payload);
            await temp.save();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear plantilla en MongoDB:', error);
            return id;
        }
    } else {
        try {
            ldb.get('templates').push(payload).write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear plantilla en Lowdb:', error);
            return id;
        }
    }
}

export async function deleteTemplate(id: number): Promise<void> {
    if (isMongo) {
        try {
            await TemplateModel.deleteOne({ id });
        } catch (error) {
            console.error('❌ [DB] Error al eliminar plantilla en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('templates').remove({ id }).write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar plantilla en Lowdb:', error);
        }
    }
}

export async function updateTemplate(id: number, name: string, content: string): Promise<void> {
    if (isMongo) {
        try {
            await TemplateModel.updateOne({ id }, { $set: { name, content } });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar plantilla en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('templates').find({ id }).assign({ name, content }).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar plantilla en Lowdb:', error);
        }
    }
}

// ==========================================
// 10. SUPPORT ESCALATION (PAUSED CHATS) CRUD
// ==========================================

export async function pauseChat(chatId: string, reason: string, durationHours: number = 6): Promise<void> {
    const pausedUntil = new Date(Date.now() + durationHours * 3600000).toISOString();
    const payload: PausedChatData = { chatId, reason, pausedUntil, timestamp: new Date() };

    if (isMongo) {
        try {
            await PausedChatModel.findOneAndUpdate(
                { chatId },
                { $set: payload },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('❌ [DB] Error al pausar chat en MongoDB:', error);
        }
    } else {
        try {
            const exists = ldb.get('paused_chats').find({ chatId }).value();
            if (exists) {
                ldb.get('paused_chats').find({ chatId }).assign(payload).write();
            } else {
                ldb.get('paused_chats').push(payload).write();
            }
        } catch (error) {
            console.error('❌ [DB] Error al pausar chat en Lowdb:', error);
        }
    }
}

export async function unpauseChat(chatId: string): Promise<void> {
    if (isMongo) {
        try {
            await PausedChatModel.deleteOne({ chatId });
        } catch (error) {
            console.error('❌ [DB] Error al despausar chat en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('paused_chats').remove({ chatId }).write();
        } catch (error) {
            console.error('❌ [DB] Error al despausar chat en Lowdb:', error);
        }
    }
}

export async function isChatPaused(chatId: string): Promise<boolean> {
    if (isMongo) {
        try {
            const row = await PausedChatModel.findOne({ chatId }).lean() as PausedChatData | null;
            if (!row) return false;
            
            if (new Date(row.pausedUntil) > new Date()) {
                return true;
            } else {
                // Auto cleanup expired
                await PausedChatModel.deleteOne({ chatId });
                return false;
            }
        } catch (error) {
            return false;
        }
    } else {
        try {
            const row = ldb.get('paused_chats').find({ chatId }).value();
            if (!row) return false;
            
            if (new Date(row.pausedUntil) > new Date()) {
                return true;
            } else {
                ldb.get('paused_chats').remove({ chatId }).write();
                return false;
            }
        } catch (error) {
            return false;
        }
    }
}

export async function listPausedChats(): Promise<any[]> {
    if (isMongo) {
        try {
            return await PausedChatModel.find().sort({ timestamp: -1 }).lean();
        } catch (error) {
            return [];
        }
    } else {
        try {
            const list = ldb.get('paused_chats').value() || [];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            return [];
        }
    }
}

// ==========================================
// 11. AUTORESPONDERS CRUD
// ==========================================

export async function listAutoresponders(): Promise<any[]> {
    if (isMongo) {
        try {
            return await AutoresponderModel.find().sort({ timestamp: -1 }).lean();
        } catch (error) {
            return [];
        }
    } else {
        try {
            const list = ldb.get('autoresponders').value() || [];
            return list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            return [];
        }
    }
}

export async function createAutoresponder(
    keyword: string,
    matchType: string,
    response: string,
    aiAction: string,
    isActive: boolean = true,
    parentId: number | null = null,
    options: string | null = null
): Promise<number> {
    const id = generateNumericId();
    const payload: AutoresponderData = {
        id,
        keyword,
        matchType,
        response,
        aiAction,
        isActive: isActive ? 1 : 0,
        parentId: parentId || undefined,
        options: options || undefined,
        timestamp: new Date()
    };

    if (isMongo) {
        try {
            const aut = new AutoresponderModel(payload);
            await aut.save();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear autorespondedor en MongoDB:', error);
            return id;
        }
    } else {
        try {
            ldb.get('autoresponders').push(payload).write();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear autorespondedor en Lowdb:', error);
            return id;
        }
    }
}

export async function updateAutoresponder(
    id: number,
    keyword: string,
    matchType: string,
    response: string,
    aiAction: string,
    isActive: boolean,
    parentId: number | null = null,
    options: string | null = null
): Promise<void> {
    const payload = {
        keyword,
        matchType,
        response,
        aiAction,
        isActive: isActive ? 1 : 0,
        parentId: parentId || undefined,
        options: options || undefined
    };

    if (isMongo) {
        try {
            await AutoresponderModel.updateOne({ id }, { $set: payload });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar autorespondedor en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('autoresponders').find({ id }).assign(payload).write();
        } catch (error) {
            console.error('❌ [DB] Error al actualizar autorespondedor en Lowdb:', error);
        }
    }
}

export async function toggleAutoresponder(id: number, isActive: boolean): Promise<void> {
    const activeVal = isActive ? 1 : 0;
    if (isMongo) {
        try {
            await AutoresponderModel.updateOne({ id }, { $set: { isActive: activeVal } });
        } catch (error) {
            console.error('❌ [DB] Error al alternar autorespondedor en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('autoresponders').find({ id }).assign({ isActive: activeVal }).write();
        } catch (error) {
            console.error('❌ [DB] Error al alternar autorespondedor en Lowdb:', error);
        }
    }
}

export async function deleteAutoresponder(id: number): Promise<void> {
    if (isMongo) {
        try {
            await AutoresponderModel.deleteOne({ id });
        } catch (error) {
            console.error('❌ [DB] Error al eliminar autorespondedor en MongoDB:', error);
        }
    } else {
        try {
            ldb.get('autoresponders').remove({ id }).write();
        } catch (error) {
            console.error('❌ [DB] Error al eliminar autorespondedor en Lowdb:', error);
        }
    }
}

// ==========================================
// 12. USER MENU STATES CRUD
// ==========================================

export async function getUserState(chatId: string): Promise<number | null> {
    if (isMongo) {
        try {
            const row = await UserStateModel.findOne({ chatId }).lean() as UserStateData | null;
            return row ? (row.currentMenuId ?? null) : null;
        } catch (error) {
            return null;
        }
    } else {
        try {
            const row = ldb.get('user_states').find({ chatId }).value();
            return row ? (row.currentMenuId ?? null) : null;
        } catch (error) {
            return null;
        }
    }
}

export async function setUserState(chatId: string, currentMenuId: number | null): Promise<void> {
    if (isMongo) {
        try {
            if (currentMenuId === null) {
                await UserStateModel.deleteOne({ chatId });
            } else {
                await UserStateModel.findOneAndUpdate(
                    { chatId },
                    { $set: { currentMenuId, timestamp: new Date() } },
                    { upsert: true }
                );
            }
        } catch (error) {
            console.error('❌ [DB] Error al guardar estado en MongoDB:', error);
        }
    } else {
        try {
            if (currentMenuId === null) {
                ldb.get('user_states').remove({ chatId }).write();
            } else {
                const exists = ldb.get('user_states').find({ chatId }).value();
                if (exists) {
                    ldb.get('user_states').find({ chatId }).assign({ currentMenuId, timestamp: new Date() }).write();
                } else {
                    ldb.get('user_states').push({ chatId, currentMenuId, timestamp: new Date() }).write();
                }
            }
        } catch (error) {
            console.error('❌ [DB] Error al guardar estado en Lowdb:', error);
        }
    }
}

// ==========================================
// 13. CONVENIENCE GETTERS
// ==========================================

export function getActiveEngine(): 'mongodb' | 'lowdb' | 'none' {
    if (isMongo) return 'mongodb';
    if (ldb) return 'lowdb';
    return 'none';
}
