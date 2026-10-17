/**
 * DECISIÓN DE ARQUITECTURA DE FECHAS:
 * En la frontera de persistencia (Lowdb JSON / MongoDB) y en el transporte (REST API, WebSockets y UI React),
 * los timestamps se representan estrictamente como cadenas ISO 8601 (string).
 * Las instancias Date/DateTime se restringen a la lógica de negocio y cálculos de recurrencia en tiempo real.
 */

export interface Reminder {
    id: number;
    userId: string;
    chatId: string;
    title?: string;
    text: string;
    time: string;
    mediaPath?: string;
    mediaType?: string;
    status: 'pending' | 'processing' | 'sent' | 'failed';
    repeat?: string;
    repeatInterval?: number;
    repeatUnit?: string;
    timestamp: string; // ISO 8601 string
    channel?: 'whatsapp' | 'sms';
}

export type ReminderData = Reminder;
