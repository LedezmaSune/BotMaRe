import { bot } from './bot';
import { getConfig } from '../core/config';

/**
 * Servicio centralizado para enviar notificaciones de sistema a los administradores vía Telegram.
 */
export class NotificationService {
    
    /**
     * Envía un mensaje a todos los IDs permitidos en TELEGRAM_ALLOWED_USER_IDS.
     */
    static async notifyAdmin(message: string, options?: { parse_mode?: 'Markdown' | 'HTML', reply_markup?: any }) {
        const adminIdsStr = await getConfig('TELEGRAM_ALLOWED_USER_IDS');
        
        // Si no hay bot o no hay IDs configurados, no hacemos nada
        if (!bot || !adminIdsStr) {
            return;
        }

        const adminIds = adminIdsStr.split(',').map(id => id.trim()).filter(Boolean);
        const parseMode = options?.parse_mode || 'Markdown';
        
        for (const id of adminIds) {
            try {
                // Usamos bot.api para enviar mensajes de forma asíncrona
                await bot.api.sendMessage(id, message, { 
                    parse_mode: parseMode,
                    link_preview_options: { is_disabled: true },
                    reply_markup: options?.reply_markup
                });
            } catch (error: any) {
                console.error(`[NotificationService] Error enviando notificación a ${id}:`, error.message);
            }
        }
    }

    /**
     * Notificación específica para eventos de IA / Modelos
     */
    static async notifyModelEvent(provider: string, model: string, status: 'success' | 'fail' | 'warning', details?: string) {
        // Solo notificar si está habilitado en el entorno (por defecto false para no saturar)
        const isEnabled = await getConfig('NOTIFY_MODELS_TELEGRAM', 'false');
        if (isEnabled !== 'true') return;

        let emoji = '✅';
        let statusText = 'Éxito';
        
        if (status === 'fail') {
            emoji = '❌';
            statusText = 'Fallo';
        } else if (status === 'warning') {
            emoji = '⚠️';
            statusText = 'Advertencia';
        }

        const message = `${emoji} *Notificación de IA*\n\n` +
                        `*Proveedor:* ${provider}\n` +
                        `*Modelo:* \`${model}\`\n` +
                        `*Estado:* ${statusText}\n` +
                        (details ? `\n*Detalles:*\n_${details}_` : '');

        await this.notifyAdmin(message);
    }
}
