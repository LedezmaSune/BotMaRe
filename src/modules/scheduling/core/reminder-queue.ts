import { Reminder } from '../../../types';
import { MessageService } from '../../messages/message.service';
import { ReminderService } from '../../reminders/reminder.service';
import { SmsService } from '../../sms/sms.service';
import { DeliveryDispatcher } from '../services/delivery.dispatcher';

export class ReminderQueue {
    private queue: Reminder[] = [];
    private inFlightLocks: Set<number> = new Set();
    private isWorkerRunning: boolean = false;
    private maxConcurrency: number = 1; // 1 para respetar estrictamente las políticas anti-ban de WhatsApp

    constructor(
        private waService: MessageService,
        private smsService: SmsService,
        private reminderService: ReminderService
    ) {}

    /**
     * Encola uno o varios recordatorios evitando duplicados en memoria.
     */
    enqueue(items: Reminder | Reminder[]): void {
        const list = Array.isArray(items) ? items : [items];
        for (const item of list) {
            if (!this.inFlightLocks.has(item.id) && !this.queue.some(q => q.id === item.id)) {
                this.queue.push(item);
            }
        }
        this.processNext();
    }

    /**
     * Verifica si un ID de recordatorio está en proceso o en cola.
     */
    isBusy(reminderId: number): boolean {
        return this.inFlightLocks.has(reminderId) || this.queue.some(q => q.id === reminderId);
    }

    /**
     * Retorna estadísticas del estado de la cola.
     */
    getStatus() {
        return {
            inFlightCount: this.inFlightLocks.size,
            queuedCount: this.queue.length,
            isWorkerRunning: this.isWorkerRunning
        };
    }

    /**
     * Procesa los elementos de la cola de manera asíncrona y no bloqueante.
     */
    private async processNext(): Promise<void> {
        if (this.isWorkerRunning || this.queue.length === 0) {
            return;
        }

        this.isWorkerRunning = true;

        try {
            while (this.queue.length > 0) {
                const nextReminder = this.queue.shift();
                if (!nextReminder) continue;

                this.inFlightLocks.add(nextReminder.id);

                try {
                    await DeliveryDispatcher.dispatch(
                        nextReminder,
                        this.waService,
                        this.smsService,
                        this.reminderService
                    );
                } catch (err: any) {
                    console.error(`[ReminderQueue] Error procesando #${nextReminder.id}:`, err.message);
                } finally {
                    this.inFlightLocks.delete(nextReminder.id);
                }

                // Pausa Anti-Ban / Jitter Buffer entre recordatorios consecutivos en cola
                if (this.queue.length > 0) {
                    const queueDelay = 3000 + Math.random() * 3000; // 3 a 6 segundos
                    console.log(`[ReminderQueue] Esperando ${Math.round(queueDelay / 1000)}s antes del siguiente recordatorio (${this.queue.length} restante(s))...`);
                    await new Promise(res => setTimeout(res, queueDelay));
                }
            }
        } finally {
            this.isWorkerRunning = false;
        }
    }

    /**
     * Limpia la cola activa.
     */
    clear(): void {
        this.queue = [];
    }
}
