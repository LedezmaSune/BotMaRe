import { Server } from 'socket.io';
import { NotificationService } from '../telegram/notification.service';
import { globalEvents, EVENTS } from './events';
import { getConfig } from './config';
import { MessageService } from '../modules/messages/message.service';

export interface SystemNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
    source?: string;
    link?: string;
    read?: boolean;
}

/**
 * HUB CENTRALIZADO DE NOTIFICACIONES MULTICANAL (BOTMARE)
 * Gestiona el envío en tiempo real al Dashboard Web (WebSockets),
 * Telegram, WhatsApp y Web Push de escritorio.
 */
export class NotificationHub {
    private static io: Server | null = null;
    private static waService: MessageService | null = null;
    private static history: SystemNotification[] = [];
    private static readonly MAX_HISTORY = 60;
    private static isInitialized = false;

    static init(io: Server, waService?: MessageService) {
        this.io = io;
        if (waService) this.waService = waService;

        if (this.isInitialized) return;
        this.isInitialized = true;

        // Escuchar eventos globales internos del sistema
        globalEvents.on(EVENTS.DIFFUSION_PROGRESS, (data: any) => {
            if (data?.percentage === 50) {
                this.notify({
                    title: '📢 Difusión Masiva al 50%',
                    message: `Progreso: ${data.current} de ${data.total} contactos procesados.`,
                    type: 'info',
                    source: 'diffusion',
                    link: '/'
                });
            }
        });

        globalEvents.on(EVENTS.DIFFUSION_COMPLETED, (data: any) => {
            this.notify({
                title: '✅ Difusión Completada',
                message: `Campaña finalizada exitosamente: ${data.success || 0} enviados de ${data.total || 0}.`,
                type: 'success',
                source: 'diffusion',
                link: '/'
            });
        });

        console.log('[NotificationHub] Hub central de notificaciones inicializado.');
    }

    static setWaService(waService: MessageService) {
        this.waService = waService;
    }

    static getHistory(): SystemNotification[] {
        return this.history;
    }

    static clearHistory(): void {
        this.history = [];
    }

    /**
     * Emite una notificación a todos los canales disponibles
     */
    static async notify(notif: Omit<SystemNotification, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<SystemNotification> {
        const fullNotif: SystemNotification = {
            id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            timestamp: notif.timestamp || Date.now(),
            source: notif.source || 'system',
            link: notif.link,
            read: false
        };

        // Guardar en buffer circular en memoria
        this.history.unshift(fullNotif);
        if (this.history.length > this.MAX_HISTORY) {
            this.history = this.history.slice(0, this.MAX_HISTORY);
        }

        // 1. Emitir en tiempo real al Dashboard Web vía Socket.io
        if (this.io) {
            this.io.emit('system_notification', fullNotif);
        }

        // 2. Emitir al event emitter interno
        globalEvents.emit(EVENTS.SYSTEM_NOTIFY, fullNotif);

        // 3. Notificar al canal de Telegram si es relevante (alertas, errores, handoff, difusiones)
        try {
            if (fullNotif.type === 'warning' || fullNotif.type === 'error' || fullNotif.source === 'handoff') {
                const prefix = fullNotif.type === 'error' ? '❌' : (fullNotif.type === 'warning' ? '⚠️' : '🔔');
                await NotificationService.notifyAdmin(
                    `${prefix} *${fullNotif.title}*\n\n${fullNotif.message}${fullNotif.link ? `\n\n🔗 ${fullNotif.link}` : ''}`
                );
            }
        } catch (e) {
            console.warn('[NotificationHub] Error enviando a Telegram:', (e as any)?.message);
        }

        // 4. Notificar por WhatsApp al Admin si está habilitado
        try {
            const notifyOwnerWa = await getConfig('NOTIFY_OWNER_WHATSAPP', 'false');
            const ownerNumber = await getConfig('WHATSAPP_OWNER_NUMBER', '');
            if (notifyOwnerWa === 'true' && ownerNumber && this.waService && (fullNotif.type === 'warning' || fullNotif.type === 'error' || fullNotif.source === 'handoff')) {
                const ownerJid = ownerNumber.includes('@') ? ownerNumber : `${ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;
                await this.waService.sendMessage(ownerJid, `🔔 *[Alerta BotMaRe]*\n\n*${fullNotif.title}*\n${fullNotif.message}`);
            }
        } catch (e) {
            console.warn('[NotificationHub] Error enviando a WhatsApp Admin:', (e as any)?.message);
        }

        return fullNotif;
    }
}
