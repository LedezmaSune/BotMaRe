import cron, { ScheduledTask } from 'node-cron';
import { ReminderQueue } from './reminder-queue';
import { ReminderService } from '../../reminders/reminder.service';
import { MessageService } from '../../messages/message.service';
import { ReminderCheckerJob } from '../jobs/reminder-checker.job';
import { FileCleanupJob } from '../jobs/file-cleanup.job';
import { SheetsSyncJob } from '../jobs/sheets-sync.job';
import { BaileysMaintenanceJob } from '../jobs/baileys-maintenance.job';
import { UpdateCheckerJob } from '../jobs/update-checker.job';

import { NotificationHub } from '../../../core/notificationHub';

export class TaskRunner {
    private isRunning: boolean = false;
    private reminderIntervalId: NodeJS.Timeout | null = null;
    private sheetsIntervalId: NodeJS.Timeout | null = null;
    private tempCleanupIntervalId: NodeJS.Timeout | null = null;
    private cronTasks: ScheduledTask[] = [];
    private initialTimeouts: NodeJS.Timeout[] = [];
    private static consecutiveFailures = new Map<string, number>();

    constructor(
        private reminderQueue: ReminderQueue,
        private reminderService: ReminderService,
        private waService: MessageService
    ) {}

    /**
     * Helper seguro para ejecutar jobs con aislamiento, tracking de fallos y alertas a NotificationHub.
     */
    static async safeRun(jobName: string, fn: () => Promise<void>): Promise<void> {
        try {
            await fn();
            // Resetear contador al tener éxito
            this.consecutiveFailures.set(jobName, 0);
        } catch (err: any) {
            const count = (this.consecutiveFailures.get(jobName) || 0) + 1;
            this.consecutiveFailures.set(jobName, count);
            console.error(`[TaskRunner] Error en ${jobName} (Fallo consecutivo #${count}):`, err.message);

            // Si falla repetidamente (3 o más veces consecutivas), alertar por NotificationHub
            if (count >= 3) {
                try {
                    NotificationHub.notify({
                        title: `Fallo recurrente en ${jobName}`,
                        message: `El trabajo ${jobName} ha fallado ${count} veces consecutivas. Último error: ${err.message}`,
                        type: 'error',
                        source: 'scheduler'
                    }).catch(() => {});
                } catch (e) {}
            }
        }
    }

    /**
     * Inicia todos los trabajos programados con aislamiento de errores.
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log("[TaskRunner] Iniciando orquestador de tareas en segundo plano...");

        // 1. Revisión de recordatorios vencidos cada 1 minuto
        this.reminderIntervalId = setInterval(() => {
            TaskRunner.safeRun('ReminderCheckerJob', () =>
                ReminderCheckerJob.execute(this.reminderQueue, this.reminderService)
            );
        }, 60000);

        // 2. Sincronización de Google Sheets cada 5 minutos
        this.sheetsIntervalId = setInterval(() => {
            TaskRunner.safeRun('SheetsSyncJob', () => SheetsSyncJob.execute());
        }, 5 * 60 * 1000);

        // 3. Limpieza de archivos temporales cada 3 minutos
        this.tempCleanupIntervalId = setInterval(() => {
            TaskRunner.safeRun('FileCleanupJob.cleanupTemp', () => FileCleanupJob.cleanupTemp());
        }, 3 * 60 * 1000);

        // 4. Limpieza profunda diaria de disco, purga de logs y optimización (cron: '0 4 * * *' - 4:00 AM)
        const dailyCleanupJob = cron.schedule('0 4 * * *', async () => {
            console.log("[TaskRunner] Ejecutando mantenimiento diario de disco y optimización de base de datos...");
            await TaskRunner.safeRun('FileCleanupJob.cleanupUploads', () => FileCleanupJob.cleanupUploads());
            await TaskRunner.safeRun('FileCleanupJob.cleanupOldLogsAndBackups', () => FileCleanupJob.cleanupOldLogsAndBackups());
            // NOTA: Se desactivó el mantenimiento de Baileys (Cachés/Sesiones) porque provocaba desconexiones de WhatsApp.
            // await BaileysMaintenanceJob.execute(this.waService);
        });
        this.cronTasks.push(dailyCleanupJob);

        // 6. Verificación periódica de nuevas versiones en GitHub cada 12 horas (cron: '0 */12 * * *')
        const updateJob = cron.schedule('0 */12 * * *', () => {
            TaskRunner.safeRun('UpdateCheckerJob', () => UpdateCheckerJob.execute());
        });
        this.cronTasks.push(updateJob);

        // Disparos iniciales seguros no bloqueantes tras arranque
        this.initialTimeouts.push(setTimeout(() => TaskRunner.safeRun('initial.cleanupUploads', () => FileCleanupJob.cleanupUploads()), 5000));
        this.initialTimeouts.push(setTimeout(() => TaskRunner.safeRun('initial.cleanupOldLogsAndBackups', () => FileCleanupJob.cleanupOldLogsAndBackups()), 10000));
        this.initialTimeouts.push(setTimeout(() => TaskRunner.safeRun('initial.UpdateCheckerJob', () => UpdateCheckerJob.execute()), 15000));
        this.initialTimeouts.push(setTimeout(() => TaskRunner.safeRun('initial.ReminderCheckerJob', () => ReminderCheckerJob.execute(this.reminderQueue, this.reminderService)), 1000));

        console.log("[TaskRunner] Todas las tareas programadas han sido inicializadas exitosamente.");
    }

    /**
     * Detiene todas las tareas programadas y temporizadores de forma limpia.
     */
    stop(): void {
        if (!this.isRunning) return;

        if (this.reminderIntervalId) {
            clearInterval(this.reminderIntervalId);
            this.reminderIntervalId = null;
        }

        if (this.sheetsIntervalId) {
            clearInterval(this.sheetsIntervalId);
            this.sheetsIntervalId = null;
        }

        if (this.tempCleanupIntervalId) {
            clearInterval(this.tempCleanupIntervalId);
            this.tempCleanupIntervalId = null;
        }

        for (const task of this.cronTasks) {
            task.stop();
        }
        this.cronTasks = [];

        for (const timeout of this.initialTimeouts) {
            clearTimeout(timeout);
        }
        this.initialTimeouts = [];

        this.reminderQueue.clear();
        this.isRunning = false;

        console.log("[TaskRunner] Orquestador de tareas detenido.");
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            cronTasksCount: this.cronTasks.length,
            queue: this.reminderQueue.getStatus()
        };
    }
}
