import { MessageService } from '../../messages/message.service';
import { ReminderService } from '../../reminders/reminder.service';
import { SmsService } from '../../sms/sms.service';
import { createReminder } from '../../../core/memory';
import { processVariables } from '../../../utils/variables';
import { parseContactList } from '../../../utils/contactParser';
import { RecurrenceService } from './recurrence.service';
import { MediaResolverService } from './media-resolver.service';
import { Reminder } from '../../../types';

export interface DispatcherResult {
    success: boolean;
    sentCount: number;
    error?: string;
}

export class DeliveryDispatcher {
    /**
     * Despacha un recordatorio específico a sus destinatarios.
     * Gestiona variables de texto, canales (WhatsApp/SMS), medios, pausas anti-ban y reprogramación recurrente.
     */
    static async dispatch(
        reminder: Reminder,
        waService: MessageService,
        smsService: SmsService,
        reminderService: ReminderService
    ): Promise<DispatcherResult> {
        const reminderId = reminder.id;
        const channel = reminder.channel || 'whatsapp';

        try {
            // Fase 1: Bloqueo en estado 'processing'
            await reminderService.updateStatus(reminderId, 'processing');
            console.log(`[DeliveryDispatcher] Procesando recordatorio #${reminderId} para ${reminder.chatId} (${channel})`);

            // Fase 2: Parseo de contactos destinatarios
            const parsedContacts = parseContactList(reminder.chatId);
            let sentCount = 0;

            for (const contact of parsedContacts) {
                const targetId = contact.number;
                const targetName = contact.name;
                const personalizedText = processVariables(reminder.text, targetName);

                if (channel === 'sms') {
                    try {
                        await smsService.sendMessage(targetId, personalizedText);
                        console.log(`[DeliveryDispatcher] SMS enviado exitosamente a ${targetId}`);
                        sentCount++;
                    } catch (err: any) {
                        console.error(`[DeliveryDispatcher] Error enviando SMS a ${targetId}:`, err.message);
                        throw err;
                    }
                } else {
                    // Flujo WhatsApp
                    if (reminder.mediaPath) {
                        const mediaResolution = await MediaResolverService.resolveMediaPath(reminder.mediaPath, reminder.mediaType);

                        if (mediaResolution.exists && mediaResolution.finalPath) {
                            await waService.sendMedia(targetId, mediaResolution.finalPath, personalizedText);
                        } else {
                            console.warn(`[DeliveryDispatcher] Saltando adjunto para #${reminderId}: ${mediaResolution.warning || 'no encontrado'}`);
                            await waService.sendMessage(targetId, `${personalizedText}\n\n(No se pudo adjuntar el archivo multimedia)`);
                        }
                    } else {
                        await waService.sendMessage(targetId, personalizedText);
                    }
                    sentCount++;
                }

                // --- PROTECCIÓN ANTI-BAN (Jitter Buffer) ---
                // Pausa aleatoria entre 3 y 6 segundos si hay más contactos o múltiples envíos
                if (parsedContacts.length > 1) {
                    const delay = 3000 + Math.random() * 3000;
                    await new Promise(res => setTimeout(res, delay));
                }
            }

            // Fase 3: Éxito y Auditoría
            await reminderService.updateStatus(reminderId, 'sent');
            await reminderService.logAudit('system', 'REMINDER_SENT', {
                id: reminderId,
                to: reminder.chatId,
                type: reminder.mediaPath ? 'media' : 'text',
                channel,
                contactsCount: parsedContacts.length
            });
            console.log(`[DeliveryDispatcher] Recordatorio #${reminderId} enviado con éxito a ${sentCount} contacto(s).`);

            // Fase 4: Recurrencia / Reprogramación
            if (reminder.repeat && reminder.repeat !== 'none') {
                const nextTimeStr = RecurrenceService.calculateNextTime({
                    time: reminder.time,
                    repeat: reminder.repeat,
                    repeatInterval: reminder.repeatInterval,
                    repeatUnit: reminder.repeatUnit
                });

                if (nextTimeStr) {
                    await createReminder(
                        reminder.userId,
                        reminder.chatId,
                        reminder.text,
                        nextTimeStr,
                        reminder.mediaPath,
                        reminder.mediaType,
                        reminder.repeat,
                        reminder.repeatInterval,
                        reminder.repeatUnit,
                        reminder.title,
                        'pending',
                        reminder.channel
                    );
                    console.log(`[DeliveryDispatcher] Recordatorio #${reminderId} reprogramado automáticamente para ${nextTimeStr}`);
                }
            }

            return { success: true, sentCount };
        } catch (error: any) {
            console.error(`[DeliveryDispatcher] Error despachando recordatorio #${reminderId}:`, error.message);
            await reminderService.updateStatus(reminderId, 'failed');
            await reminderService.logAudit('system', 'REMINDER_FAILED', {
                id: reminderId,
                to: reminder.chatId,
                error: error.message,
                channel
            });

            return { success: false, sentCount: 0, error: error.message };
        }
    }
}
