import { MessageService } from '../messages/message.service';
import { ReminderService } from '../reminders/reminder.service';
import { SmsService } from '../sms/sms.service';
import { ReminderQueue } from './core/reminder-queue';
import { TaskRunner } from './core/task-runner';
import { DeliveryDispatcher } from './services/delivery.dispatcher';
import { getReminderById } from '../../core/memory';

/**
 * FACHADA PRINCIPAL DEL SISTEMA DE SCHEDULING (BOTMARE)
 * Mantiene 100% de compatibilidad con Server y Controladores, delegando la
 * ejecución en submódulos especializados (TaskRunner, ReminderQueue, Jobs y Services).
 */
export class Scheduler {
    private static waService: MessageService;
    private static reminderService: ReminderService;
    private static smsService: SmsService;

    private static queue: ReminderQueue | null = null;
    private static runner: TaskRunner | null = null;

    /**
     * Inicializa el sistema de scheduling completo.
     */
    static init(waService: MessageService, reminderService: ReminderService): void {
        this.waService = waService;
        this.reminderService = reminderService;
        this.smsService = new SmsService();

        // Inicializar cola de procesamiento
        this.queue = new ReminderQueue(this.waService, this.smsService, this.reminderService);

        // Inicializar orquestador de tareas
        if (this.runner) {
            this.runner.stop();
        }
        this.runner = new TaskRunner(this.queue, this.reminderService, this.waService);
        this.runner.start();

        console.log("[Scheduler] Motor de Scheduling modular inicializado correctamente.");
    }

    /**
     * Detiene todas las tareas programadas y limpia las colas.
     */
    static stop(): void {
        if (this.runner) {
            this.runner.stop();
            this.runner = null;
        }
        this.queue = null;
        console.log("[Scheduler] Sistema de Scheduling detenido.");
    }

    /**
     * Dispara de forma manual e inmediata un recordatorio específico por su ID.
     */
    static async sendNow(reminderId: number): Promise<void> {
        if (!this.waService || !this.reminderService || !this.smsService) {
            throw new Error("Scheduler no ha sido inicializado.");
        }

        const reminder = await getReminderById(reminderId);
        if (!reminder) {
            throw new Error(`Recordatorio #${reminderId} no encontrado.`);
        }
        if (reminder.status === 'sent') {
            throw new Error(`El recordatorio #${reminderId} ya fue enviado previamente.`);
        }

        // Si la cola está activa, lo encolamos o lo despachamos directamente
        const result = await DeliveryDispatcher.dispatch(
            reminder,
            this.waService,
            this.smsService,
            this.reminderService
        );

        if (!result.success) {
            throw new Error(result.error || `Fallo al despachar recordatorio #${reminderId}`);
        }
    }

    /**
     * Devuelve el estado y métricas del scheduler en tiempo de ejecución.
     */
    static getStatus() {
        return {
            isInitialized: !!this.runner,
            runnerStatus: this.runner ? this.runner.getStatus() : null
        };
    }
}
