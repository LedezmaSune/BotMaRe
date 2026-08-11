import cron, { ScheduledTask } from 'node-cron';
import { ReminderQueue } from './reminder-queue';
import { ReminderService } from '../../reminders/reminder.service';
import { MessageService } from '../../messages/message.service';
import { ReminderCheckerJob } from '../jobs/reminder-checker.job';
import { FileCleanupJob } from '../jobs/file-cleanup.job';
import { SheetsSyncJob } from '../jobs/sheets-sync.job';
import { BaileysMaintenanceJob } from '../jobs/baileys-maintenance.job';

export class TaskRunner {
    private isRunning: boolean = false;
    private reminderIntervalId: NodeJS.Timeout | null = null;
    private sheetsIntervalId: NodeJS.Timeout | null = null;
    private tempCleanupIntervalId: NodeJS.Timeout | null = null;
    private cronTasks: ScheduledTask[] = [];

    constructor(
        private reminderQueue: ReminderQueue,
        private reminderService: ReminderService,
        private waService: MessageService
    ) {}

    /**
     * Inicia todos los trabajos programados con aislamiento de errores.
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log("[TaskRunner] Iniciando orquestador de tareas en segundo plano...");

        // 1. Revisión de recordatorios vencidos cada 30 segundos
        this.reminderIntervalId = setInterval(() => {
            ReminderCheckerJob.execute(this.reminderQueue, this.reminderService).catch(err => {
                console.error("[TaskRunner] Error no capturado en ReminderCheckerJob:", err.message);
            });
        }, 30000);

        // 2. Sincronización de Google Sheets cada 1 minuto
        this.sheetsIntervalId = setInterval(() => {
            SheetsSyncJob.execute().catch(err => {
                console.error("[TaskRunner] Error no capturado en SheetsSyncJob:", err.message);
            });
        }, 60 * 1000);

        // 3. Limpieza de archivos temporales cada 3 minutos
        this.tempCleanupIntervalId = setInterval(() => {
            FileCleanupJob.cleanupTemp().catch(err => {
                console.error("[TaskRunner] Error no capturado en FileCleanupJob.cleanupTemp:", err.message);
            });
        }, 3 * 60 * 1000);

        // 4. Mantenimiento de claves pre-keys de Baileys cada hora (cron: '0 * * * *')
        const baileysJob = cron.schedule('0 * * * *', () => {
            BaileysMaintenanceJob.execute(this.waService).catch(err => {
                console.error("[TaskRunner] Error en BaileysMaintenanceJob:", err.message);
            });
        });
        this.cronTasks.push(baileysJob);

        // 5. Limpieza profunda diaria de uploads y purga de logs/backups (cron: '0 4 * * *' - 4:00 AM)
        const dailyCleanupJob = cron.schedule('0 4 * * *', async () => {
            console.log("[TaskRunner] Ejecutando mantenimiento diario de disco...");
            await FileCleanupJob.cleanupUploads();
            await FileCleanupJob.cleanupOldLogsAndBackups();
        });
        this.cronTasks.push(dailyCleanupJob);

        // Disparos iniciales seguros no bloqueantes tras arranque
        setTimeout(() => FileCleanupJob.cleanupUploads().catch(() => {}), 5000);
        setTimeout(() => FileCleanupJob.cleanupOldLogsAndBackups().catch(() => {}), 10000);
        setTimeout(() => ReminderCheckerJob.execute(this.reminderQueue, this.reminderService).catch(() => {}), 1000);

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
