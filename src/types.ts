export type { Reminder } from './domain';

export interface Settings {
    bot_name: string;
    system_prompt: string;
    possible_responses: string;
    [key: string]: string;
}

export interface Autoresponder {
    id: number;
    keyword: string;
    matchType: 'exact' | 'contains';
    response: string;
    aiAction: 'menu_only' | 'ai_context' | 'no_response';
    isActive: number;
    timestamp: string;
    parentId?: number;
    options?: string;
}

export interface Audit {
    id: number;
    userId: string;
    action: string;
    details: string;
    timestamp: string;
}

export interface Contact {
    number: string;
    name: string;
}

export interface WhatsAppStatus {
    state: ConnectionState;
    qr: string | null;
}

export interface Template {
    id: number;
    name: string;
    content: string;
    timestamp: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';
