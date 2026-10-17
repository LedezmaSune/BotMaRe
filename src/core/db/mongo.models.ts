import mongoose from 'mongoose';
import { 
    UserData, SettingsData, MessageData, AuditData, 
    ReminderData, TemplateData, PausedChatData, 
    AutoresponderData, UserStateData 
} from './interfaces';

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
    timestamp: { type: String, default: () => new Date().toISOString() }
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

const SheetSyncSettingsSchema = new mongoose.Schema({
    spreadsheetId: { type: String, required: true },
    refreshToken: { type: String, required: true },
    syncInterval: { type: String, enum: ['15m', '1h', '12h', 'manual'], default: '1h' },
    lastSyncTime: { type: Date },
    isActive: { type: Boolean, default: true },
    authMethod: { type: String, enum: ['public', 'service_account', 'oauth'], default: 'oauth' }
}, { timestamps: true });
export const SheetSyncSettingsModel = mongoose.models.SheetSyncSettings || mongoose.model('SheetSyncSettings', SheetSyncSettingsSchema);

const CRMSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, default: 'global' },
    contacts: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    tags: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });
export const CRMModel = mongoose.models.CRM || mongoose.model('CRM', CRMSchema);

const AccessControlSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, default: 'global' },
    contacts: {
        mode: { type: String, default: 'all' },
        whitelist: [{ type: String }],
        blacklist: [{ type: String }]
    },
    groups: {
        mode: { type: String, default: 'all' },
        whitelist: [{ type: String }],
        blacklist: [{ type: String }]
    }
}, { timestamps: true });
export const AccessControlModel = mongoose.models.AccessControl || mongoose.model('AccessControl', AccessControlSchema);

const TelemetrySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, default: 'global' },
    llm: {
        totalRequests: { type: Number, default: 0 },
        totalTokens: { type: Number, default: 0 },
        totalLatencyMs: { type: Number, default: 0 },
        providerStats: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
    },
    baileys: {
        disconnects: { type: Number, default: 0 },
        reconnects: { type: Number, default: 0 },
        messagesSent: { type: Number, default: 0 }
    },
    lastUpdated: { type: Number, default: Date.now }
}, { timestamps: true });
export const TelemetryModel = mongoose.models.Telemetry || mongoose.model('Telemetry', TelemetrySchema);

