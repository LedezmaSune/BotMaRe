import mongoose from 'mongoose';
import { IDatabaseAdapter } from './db.adapter';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData, MessageRow, SheetSyncSettings 
} from './interfaces';
import {
    UserModel, SettingsModel, MessageModel, AuditModel,
    ReminderModel, TemplateModel, PausedChatModel,
    AutoresponderModel, UserStateModel
} from './mongo.models';

// Utilidad para IDs numéricos (generados igual que en Lowdb por consistencia)
function generateNumericId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
}

export class MongoAdapter implements IDatabaseAdapter {
    async initDB(): Promise<void> {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri || mongoUri === 'tu_url_de_atlas_aqui') {
            throw new Error("MONGO_URI no configurado o inválido.");
        }
        
        console.log('[DB] Intentando conectar a MongoDB Atlas...');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ [DB] Conectado exitosamente a MongoDB Atlas.');
    }

    async saveUser(id: string, data: Partial<UserData>): Promise<UserData | null> {
        try {
            const updated = await UserModel.findOneAndUpdate(
                { id }, { $set: data }, { upsert: true, new: true }
            ).lean();
            return updated as UserData | null;
        } catch (error) {
            console.error(`❌ [DB] Error al guardar usuario ${id} en MongoDB:`, error);
            return null;
        }
    }

    async getUser(id: string): Promise<UserData | null> {
        try {
            const user = await UserModel.findOne({ id }).lean();
            return user as UserData | null;
        } catch (error) {
            console.error(`❌ [DB] Error al obtener usuario ${id} de MongoDB:`, error);
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
            const rows = await SettingsModel.find().lean() as SettingsData[];
            const loaded = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
            return { ...defaultSettings, ...loaded };
        } catch (error) {
            console.error('❌ [DB] Error al obtener configuraciones en MongoDB:', error);
            return defaultSettings;
        }
    }

    async updateSettings(settings: Record<string, string>): Promise<void> {
        try {
            const operations = Object.entries(settings).map(([key, value]) => ({
                updateOne: { filter: { key }, update: { $set: { value } }, upsert: true }
            }));
            await SettingsModel.bulkWrite(operations);
        } catch (error) {
            console.error('❌ [DB] Error al actualizar configuraciones en MongoDB:', error);
        }
    }

    async addMessage(userId: string, role: string, content: string): Promise<void> {
        try {
            const msg = new MessageModel({ userId, role, content });
            await msg.save();
        } catch (error) {
            console.error('❌ [DB] Error al guardar mensaje en MongoDB:', error);
        }
    }

    async getHistory(userId: string, limit: number = 50): Promise<MessageRow[]> {
        try {
            const rows = await MessageModel.find({ userId })
                .sort({ timestamp: -1 }).limit(limit).lean() as MessageData[];
            return rows.reverse().map(row => ({
                role: row.role as any,
                content: row.content
            }));
        } catch (error) {
            console.error('❌ [DB] Error al leer historial en MongoDB:', error);
            return [];
        }
    }

    async clearHistory(userId: string): Promise<void> {
        try {
            await MessageModel.deleteMany({ userId });
        } catch (error) {
            console.error('❌ [DB] Error al vaciar historial en MongoDB:', error);
        }
    }

    async logAudit(userId: string, action: string, details: any): Promise<void> {
        const detailsStr = JSON.stringify(details);
        try {
            const audit = new AuditModel({ userId, action, details: detailsStr });
            await audit.save();
        } catch (error) {
            console.error('❌ [DB] Error al registrar auditoría en MongoDB:', error);
        }
        console.log(`[Audit Logged] ${action} for user ${userId}`);
    }

    async listAudits(limit: number = 10): Promise<any[]> {
        try {
            return await AuditModel.find().sort({ timestamp: -1 }).limit(limit).lean();
        } catch (error) {
            console.error('❌ [DB] Error al obtener auditorias en MongoDB:', error);
            return [];
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
            status, repeat, repeatInterval, repeatUnit, channel, timestamp: new Date()
        };
        try {
            const rem = new ReminderModel(payload);
            await rem.save();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear recordatorio en MongoDB:', error);
            return id;
        }
    }

    async listReminders(userId: string, includeProcessed: boolean = false): Promise<any[]> {
        try {
            const filter = includeProcessed ? { userId } : { userId, status: 'pending' };
            const sortOrder = includeProcessed ? { time: -1, id: -1 } : { time: 1, id: 1 };
            return await ReminderModel.find(filter).sort(sortOrder as any).lean();
        } catch (error) {
            console.error('❌ [DB] Error al listar recordatorios en MongoDB:', error);
            return [];
        }
    }

    async deleteReminder(id: number): Promise<void> {
        try {
            await ReminderModel.deleteOne({ id });
        } catch (error) {
            console.error('❌ [DB] Error al eliminar recordatorio en MongoDB:', error);
        }
    }

    async updateReminderStatus(id: number, status: 'pending' | 'processing' | 'sent' | 'failed'): Promise<void> {
        try {
            await ReminderModel.updateOne({ id }, { $set: { status } });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar estado de recordatorio en MongoDB:', error);
        }
    }

    async deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent'): Promise<void> {
        try {
            let filter: any = { userId };
            if (type === 'pending') filter.status = { $ne: 'sent' };
            else if (type === 'sent') filter.status = 'sent';
            await ReminderModel.deleteMany(filter);
        } catch (error) {
            console.error('❌ [DB] Error en eliminación masiva en MongoDB:', error);
        }
    }

    async getReminderById(id: number): Promise<any | null> {
        try {
            return await ReminderModel.findOne({ id }).lean();
        } catch (error) {
            return null;
        }
    }

    async listAllPendingReminders(): Promise<any[]> {
        try {
            return await ReminderModel.find({ status: 'pending' }).lean();
        } catch (error) {
            return [];
        }
    }

    async listPendingMediaPaths(): Promise<string[]> {
        try {
            const results = await ReminderModel.find(
                { status: 'pending', mediaPath: { $exists: true, $ne: null } },
                { mediaPath: 1 }
            ).lean();
            return results.map(r => r.mediaPath).filter(Boolean) as string[];
        } catch (error) {
            return [];
        }
    }

    async updateReminder(id: number, data: Partial<ReminderData>): Promise<void> {
        try {
            await ReminderModel.updateOne({ id }, { $set: data });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar recordatorio en MongoDB:', error);
        }
    }

    async listPendingOrFailedReminders(): Promise<any[]> {
        try {
            return await ReminderModel.find({ status: { $in: ['pending', 'failed'] } }).lean();
        } catch (error) {
            return [];
        }
    }

    async checkReminderExistsByMediaPath(mediaPath: string): Promise<boolean> {
        try {
            const exists = await ReminderModel.findOne({ mediaPath }).lean();
            return !!exists;
        } catch (error) {
            return false;
        }
    }

    async listTemplates(): Promise<any[]> {
        try {
            return await TemplateModel.find().sort({ name: 1 }).lean();
        } catch (error) {
            return [];
        }
    }

    async createTemplate(name: string, content: string): Promise<number> {
        const id = generateNumericId();
        try {
            const temp = new TemplateModel({ id, name, content, timestamp: new Date() });
            await temp.save();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear plantilla en MongoDB:', error);
            return id;
        }
    }

    async deleteTemplate(id: number): Promise<void> {
        try {
            await TemplateModel.deleteOne({ id });
        } catch (error) {
            console.error('❌ [DB] Error al eliminar plantilla en MongoDB:', error);
        }
    }

    async updateTemplate(id: number, name: string, content: string): Promise<void> {
        try {
            await TemplateModel.updateOne({ id }, { $set: { name, content } });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar plantilla en MongoDB:', error);
        }
    }

    async pauseChat(chatId: string, reason: string, durationHours: number = 6): Promise<void> {
        const pausedUntil = new Date(Date.now() + durationHours * 3600000).toISOString();
        try {
            await PausedChatModel.findOneAndUpdate(
                { chatId },
                { $set: { chatId, reason, pausedUntil, timestamp: new Date() } },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('❌ [DB] Error al pausar chat en MongoDB:', error);
        }
    }

    async unpauseChat(chatId: string): Promise<void> {
        try {
            await PausedChatModel.deleteOne({ chatId });
        } catch (error) {
            console.error('❌ [DB] Error al despausar chat en MongoDB:', error);
        }
    }

    async isChatPaused(chatId: string): Promise<boolean> {
        try {
            const row = await PausedChatModel.findOne({ chatId }).lean() as PausedChatData | null;
            if (!row) return false;
            
            if (new Date(row.pausedUntil) > new Date()) {
                return true;
            } else {
                await PausedChatModel.deleteOne({ chatId });
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async listPausedChats(): Promise<any[]> {
        try {
            return await PausedChatModel.find().sort({ timestamp: -1 }).lean();
        } catch (error) {
            return [];
        }
    }

    async listAutoresponders(): Promise<any[]> {
        try {
            return await AutoresponderModel.find().sort({ timestamp: -1 }).lean();
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
            const aut = new AutoresponderModel({
                id, keyword, matchType, response, aiAction,
                isActive: isActive ? 1 : 0, parentId, options, timestamp: new Date()
            });
            await aut.save();
            return id;
        } catch (error) {
            console.error('❌ [DB] Error al crear autorespondedor en MongoDB:', error);
            return id;
        }
    }

    async updateAutoresponder(
        id: number, keyword: string, matchType: string, response: string,
        aiAction: string, isActive: boolean, parentId: number | null = null, options: string | null = null
    ): Promise<void> {
        try {
            await AutoresponderModel.updateOne({ id }, { $set: {
                keyword, matchType, response, aiAction,
                isActive: isActive ? 1 : 0, parentId, options
            } });
        } catch (error) {
            console.error('❌ [DB] Error al actualizar autorespondedor en MongoDB:', error);
        }
    }

    async toggleAutoresponder(id: number, isActive: boolean): Promise<void> {
        try {
            await AutoresponderModel.updateOne({ id }, { $set: { isActive: isActive ? 1 : 0 } });
        } catch (error) {
            console.error('❌ [DB] Error al alternar autorespondedor en MongoDB:', error);
        }
    }

    async deleteAutoresponder(id: number): Promise<void> {
        try {
            await AutoresponderModel.deleteOne({ id });
        } catch (error) {
            console.error('❌ [DB] Error al eliminar autorespondedor en MongoDB:', error);
        }
    }

    async getUserState(chatId: string): Promise<number | null> {
        try {
            const row = await UserStateModel.findOne({ chatId }).lean() as UserStateData | null;
            return row ? (row.currentMenuId ?? null) : null;
        } catch (error) {
            return null;
        }
    }

    async setUserState(chatId: string, currentMenuId: number | null): Promise<void> {
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
    }

    getActiveEngine(): 'mongodb' | 'lowdb' | 'none' {
        return 'mongodb';
    }

    async getSheetSyncSettings(): Promise<SheetSyncSettings | null> {
        console.warn('⚠️ [DB] SheetSyncSettings no está implementado nativamente en MongoDB Atlas aún.');
        return null;
    }

    async saveSheetSyncSettings(settings: SheetSyncSettings): Promise<void> {
        console.warn('⚠️ [DB] SheetSyncSettings no está implementado nativamente en MongoDB Atlas aún.');
    }
}
