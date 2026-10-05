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
                const errMsg = error?.message || String(error);
                if (errMsg.includes("ETIMEDOUT") || errMsg.includes("Network request")) {
                    console.warn(`[NotificationService] Timeout de red al enviar notificación a Telegram (${id}). Se reintentará en el siguiente ciclo.`);
                } else {
                    console.error(`[NotificationService] Error enviando notificación a ${id}:`, errMsg);
                }
            }
        }
    }

    /**
     * Notificación específica para eventos de IA / Modelos
     */
    static async notifyModelEvent(provider: string, model: string, status: 'success' | 'fail' | 'warning', details?: string, metadata?: { senderId?: string; prompt?: string }) {
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

        const safePrompt = metadata?.prompt ? metadata.prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        const safeDetails = details ? details.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

        const message = `${emoji} <b>Notificación de IA</b>\n\n` +
                        `<b>Proveedor:</b> ${provider}\n` +
                        `<b>Modelo:</b> <code>${model}</code>\n` +
                        `<b>Estado:</b> ${statusText}\n` +
                        (metadata?.senderId ? `<b>Usuario:</b> <a href="https://wa.me/${metadata.senderId}">${metadata.senderId}</a>\n` : '') +
                        (safePrompt ? `<b>Preguntó:</b>\n<i>${safePrompt.substring(0, 800)}</i>\n` : '') +
                        (safeDetails ? `\n<b>Detalles:</b>\n<i>${safeDetails}</i>` : '');

        await this.notifyAdmin(message, { parse_mode: 'HTML' });
    }
}
