import { 
    UserData, 
    SettingsData, 
    MessageRow, 
    ReminderData, 
    TemplateData, 
    PausedChatData, 
    AutoresponderData, 
    UserStateData,
    SheetSyncSettings
} from './interfaces';

export interface IDatabaseAdapter {
    initDB(): Promise<void>;
    
    saveUser(id: string, data: Partial<UserData>): Promise<UserData | null>;
    getUser(id: string): Promise<UserData | null>;
    
    getSettings(): Promise<Record<string, string>>;
    updateSettings(settings: Record<string, string>): Promise<void>;
    
    addMessage(userId: string, role: string, content: string): Promise<void>;
    getHistory(userId: string, limit?: number): Promise<MessageRow[]>;
    clearHistory(userId: string): Promise<void>;
    
    logAudit(userId: string, action: string, details: any): Promise<void>;
    listAudits(limit?: number): Promise<any[]>;
    
    createReminder(
        userId: string, chatId: string, text: string, time: string, 
        mediaPath?: string, mediaType?: string, repeat?: string, 
        repeatInterval?: number, repeatUnit?: string, title?: string, 
        status?: 'pending' | 'processing' | 'sent' | 'failed',
        channel?: 'whatsapp' | 'sms'
    ): Promise<number>;
    createRemindersBulk(
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
    ): Promise<number[]>;
    listReminders(userId: string, includeProcessed?: boolean): Promise<any[]>;
    deleteReminder(id: number): Promise<void>;
    updateReminderStatus(id: number, status: 'pending' | 'processing' | 'sent' | 'failed'): Promise<void>;
    deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent'): Promise<void>;
    getReminderById(id: number): Promise<any | null>;
    listAllPendingReminders(): Promise<any[]>;
    listPendingMediaPaths(): Promise<string[]>;
    updateReminder(id: number, data: Partial<ReminderData>): Promise<void>;
    listPendingOrFailedReminders(): Promise<any[]>;
    checkReminderExistsByMediaPath(mediaPath: string): Promise<boolean>;
    
    listTemplates(): Promise<any[]>;
    createTemplate(name: string, content: string): Promise<number>;
    deleteTemplate(id: number): Promise<void>;
    updateTemplate(id: number, name: string, content: string): Promise<void>;
    
    pauseChat(chatId: string, reason: string, durationHours?: number): Promise<void>;
    unpauseChat(chatId: string): Promise<void>;
    isChatPaused(chatId: string): Promise<boolean>;
    listPausedChats(): Promise<any[]>;
    
    listAutoresponders(): Promise<any[]>;
    createAutoresponder(
        keyword: string, matchType: string, response: string, aiAction: string,
        isActive?: boolean, parentId?: number | null, options?: string | null
    ): Promise<number>;
    updateAutoresponder(
        id: number, keyword: string, matchType: string, response: string, 
        aiAction: string, isActive: boolean, parentId?: number | null, options?: string | null
    ): Promise<void>;
    toggleAutoresponder(id: number, isActive: boolean): Promise<void>;
    deleteAutoresponder(id: number): Promise<void>;
    
    getUserState(chatId: string): Promise<number | null>;
    setUserState(chatId: string, currentMenuId: number | null): Promise<void>;
    
    getSheetSyncSettings(): Promise<SheetSyncSettings | null>;
    saveSheetSyncSettings(settings: SheetSyncSettings): Promise<void>;

    getActiveEngine(): 'mongodb' | 'lowdb' | 'none';
}
