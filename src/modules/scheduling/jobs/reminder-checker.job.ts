import { DateTime } from 'luxon';
import { listAllPendingReminders } from '../../../core/memory';
import { ReminderService } from '../../reminders/reminder.service';
import { ReminderQueue } from '../core/reminder-queue';
import { Reminder } from '../../../types';

export class ReminderCheckerJob {
    private static readonly TIMEZONE = 'America/Mexico_City';
    private static isChecking = false;

    /**
     * Parsea y normaliza cualquier formato de fecha soportado para recordatorios.
     */
    static parseReminderTime(rawTime: string, now: DateTime): { isImmediate: boolean; dateTime?: DateTime; isValid: boolean } {
        const reminderTime = (rawTime || '').trim();

        if (['inmediato', 'ahora', 'inmediatamente'].includes(reminderTime.toLowerCase())) {
            return { isImmediate: true, isValid: true };
        }

        let normalized = reminderTime;

        // 1. Manejo de lenguaje natural básico ("mañana a las 10:00")
        if (normalized.toLowerCase().includes('mañana')) {
            const tomorrow = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
            const timeMatch = normalized.match(/(\d{1,2}):(\d{2})/);
            const timePart = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '08:00';
            normalized = `${tomorrow}T${timePart}`;
        } else if (normalized.length === 5 && normalized.includes(':')) {
            // 2. Manejo de formato simple "HH:mm" -> agregar fecha actual
            normalized = `${now.toFormat('yyyy-MM-dd')}T${normalized}`;
        } else if (normalized.includes(' ') && !normalized.includes('T')) {
            // 3. Normalizar formato con espacio "YYYY-MM-DD HH:mm" a ISO con "T"
            normalized = normalized.replace(' ', 'T');
        }

        const dt = DateTime.fromISO(normalized, { zone: this.TIMEZONE });
        return {
            isImmediate: false,
            dateTime: dt.isValid ? dt : undefined,
            isValid: dt.isValid
        };
    }

    /**
     * Revisa la base de datos en busca de recordatorios cuya fecha/hora haya llegado o expirado.
     */
    static async execute(reminderQueue: ReminderQueue, reminderService: ReminderService): Promise<void> {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            const now = DateTime.now().setZone(this.TIMEZONE);
            const allPending = await listAllPendingReminders();

            if (!allPending || allPending.length === 0) {
                return;
            }

            const dueReminders: Reminder[] = [];

            for (const r of allPending) {
                // Si el recordatorio ya está siendo procesado en la cola en memoria, lo ignoramos
                if (reminderQueue.isBusy(r.id)) {
                    continue;
                }

                const parsed = this.parseReminderTime(r.time, now);

                if (parsed.isImmediate) {
                    dueReminders.push(r);
                    continue;
                }

                if (!parsed.isValid || !parsed.dateTime) {
                    console.warn(`[ReminderChecker] Formato de fecha no válido para recordatorio #${r.id}: "${r.time}"`);
                    continue;
                }

                const rDateTime = parsed.dateTime;
                const diffMinutes = now.diff(rDateTime, 'minutes').minutes;

                if (rDateTime <= now) {
                    // Si el recordatorio tiene más de 5 minutos de retraso acumulado, no se dispara automáticamente
                    if (diffMinutes > 5) {
                        console.warn(`[ReminderChecker] Saltando #${r.id}: Fecha expirada (${diffMinutes.toFixed(1)} min de retraso).`);
                        await reminderService.updateStatus(r.id, 'failed');
                        await reminderService.logAudit('system', 'REMINDER_EXPIRED_SKIPPED', {
                            id: r.id,
                            delay: diffMinutes,
                            channel: r.channel || 'whatsapp'
                        });
                        continue;
                    }

                    dueReminders.push(r);
                }
            }

            if (dueReminders.length > 0) {
                console.log(`[ReminderChecker] Detectados ${dueReminders.length} recordatorio(s) listos para despacho.`);
                await reminderService.logAudit('system', 'SCHEDULER_BATCH_START', { count: dueReminders.length });
                reminderQueue.enqueue(dueReminders);
                await reminderService.logAudit('system', 'SCHEDULER_BATCH_COMPLETE', { count: dueReminders.length });
            }
        } catch (error: any) {
            console.error("[ReminderChecker] Error en el ciclo de revisión:", error);
            await reminderService.logAudit('system', 'SCHEDULER_CRITICAL_ERROR', { error: error.message });
        } finally {
            this.isChecking = false;
        }
    }
}
