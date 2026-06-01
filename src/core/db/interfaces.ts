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

export interface MessageRow {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
}
