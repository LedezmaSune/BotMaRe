import { DateTime } from 'luxon';
import fs from 'fs';
import path from 'path';
import { MessageService } from '../messages/message.service';
import { ReminderService } from '../reminders/reminder.service';
import { 
    createReminder, 
    listAllPendingReminders, 
    listPendingMediaPaths, 
    getReminderById 
} from '../../core/memory'; 
import { processVariables } from '../../utils/variables';
import { parseContactList } from '../../utils/contactParser';
import { GoogleSheetsService } from '../autoresponders/sheets.service';

export class Scheduler {
    private static waService: MessageService;
    private static reminderService: ReminderService;

    private static intervalId: NodeJS.Timeout | null = null;
    private static isChecking: boolean = false;

    static init(waService: MessageService, reminderService: ReminderService) {
        this.waService = waService;
        this.reminderService = reminderService;
        console.log("[Scheduler] System Initialized");
        
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.checkReminders(), 30000);
        
        // Background file cleanup (runs daily)
        setInterval(() => this.checkUploadCleanup(), 24 * 60 * 60 * 1000);
        setTimeout(() => this.checkUploadCleanup(), 5000); // Also run on startup after 5 secs
        
        // Background Google Sheets Sync (evaluated every 1 minute)
        setInterval(() => this.checkSheetsSync(), 60 * 1000);
    }

    static stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("[Scheduler] System Stopped");
        }
    }

    private static async asyncBatch(reminders: any[]) {
        for (const r of reminders) {
            try {
                // Phase 1: Lock for processing
                await this.reminderService.updateStatus(r.id, 'processing');
                console.log(`[Scheduler] Procesando recordatorio ${r.id} para ${r.chatId}`);
                
                // Phase 2: Send
                // Phase 2: Send
                const parsedContacts = parseContactList(r.chatId);
                
                for (const contact of parsedContacts) {
                    const targetId = contact.number;
                    const targetName = contact.name;

                    const personalizedText = processVariables(r.text, targetName);

                    if (r.mediaPath) {
                        let finalPath = r.mediaPath;
                        
                        // Reparación en caliente: Si la ruta no existe, buscamos el archivo en uploads local
                        if (!fs.existsSync(finalPath)) {
                            const fileName = path.basename(finalPath);
                            const uploadsDir = path.resolve('data/uploads');
                            const localPath = path.join(uploadsDir, fileName);

                            if (fs.existsSync(localPath)) {
                                finalPath = localPath;
                            } else if (fs.existsSync(uploadsDir)) {
                                // Búsqueda difusa por prefijo (primeros 15 caracteres)
                                const filesInDir = fs.readdirSync(uploadsDir);
                                const prefix = fileName.substring(0, 15);
                                const match = filesInDir.find(f => f.startsWith(prefix) || fileName.startsWith(f.substring(0, 15)));
                                if (match) finalPath = path.join(uploadsDir, match);
                            }
                        }

                        // Verificación final antes de enviar
                        if (fs.existsSync(finalPath)) {
                            await this.waService.sendMedia(targetId, finalPath, personalizedText);
                        } else {
                            console.warn(`[Scheduler] Saltando multimedia para ${r.id}: archivo no encontrado tras reparación.`);
                            await this.waService.sendMessage(targetId, personalizedText + "\n\n(No se pudo adjuntar el archivo multimedia)");
                        }
                    } else {
                        await this.waService.sendMessage(targetId, personalizedText);
                    }
                }

                // Phase 3: Success
                await this.reminderService.updateStatus(r.id, 'sent');
                await this.reminderService.logAudit('system', 'REMINDER_SENT', { id: r.id, to: r.chatId, type: r.mediaPath ? 'media' : 'text' });
                console.log(`[Scheduler] Recordatorio ${r.id} enviado con éxito.`);

                // --- PROTECCIÓN ANTI-BAN (BUFFER) ---
                // Retraso aleatorio de 3 a 6 segundos para simular envío humano
                const delay = 3000 + Math.random() * 3000;
                await new Promise(res => setTimeout(res, delay));
                // ------------------------------------

                // Phase 4: Repetition
                if (r.repeat && r.repeat !== 'none') {
                    let nextTime = DateTime.fromISO(r.time, { zone: 'America/Mexico_City' });
                    let validRepeat = false;

                    if (r.repeat === 'hourly') {
                        nextTime = nextTime.plus({ hours: 1 });
                        validRepeat = true;
                    } else if (r.repeat === 'daily') {
                        nextTime = nextTime.plus({ days: 1 });
                        validRepeat = true;
                    } else if (r.repeat === 'weekdays') {
                        nextTime = nextTime.plus({ days: 1 });
                        // Skip weekends (6 = Saturday, 7 = Sunday)
                        while (nextTime.weekday > 5) {
                            nextTime = nextTime.plus({ days: 1 });
                        }
                        validRepeat = true;
                    } else if (r.repeat === 'weekly') {
                        nextTime = nextTime.plus({ weeks: 1 });
                        validRepeat = true;
                    } else if (r.repeat === 'monthly') {
                        nextTime = nextTime.plus({ months: 1 });
                        validRepeat = true;
                    } else if (r.repeat === 'yearly') {
                        nextTime = nextTime.plus({ years: 1 });
                        validRepeat = true;
                    } else if (r.repeat === 'advanced' && r.repeatInterval && r.repeatUnit) {
                        const obj: any = {};
                        // Map units to luxon format if necessary
                        let unit = r.repeatUnit; // minutes, hours, days, weeks, months
                        obj[unit] = r.repeatInterval;
                        nextTime = nextTime.plus(obj);
                        validRepeat = true;
                    }

                    if (validRepeat) {
                        const nextTimeStr = nextTime.toFormat("yyyy-MM-dd'T'HH:mm");
                        await createReminder(r.userId, r.chatId, r.text, nextTimeStr, r.mediaPath, r.mediaType, r.repeat, r.repeatInterval, r.repeatUnit);
                        console.log(`[Scheduler] Recordatorio ${r.id} reprogramado para ${nextTimeStr}`);
                    }
                }
            } catch (error: any) {
                console.error(`[Scheduler] Error enviando recordatorio ${r.id}:`, error.message);
                await this.reminderService.updateStatus(r.id, 'failed'); 
                await this.reminderService.logAudit('system', 'REMINDER_FAILED', { id: r.id, to: r.chatId, error: error.message });
            }
        }
    }

    private static async checkReminders() {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            const now = DateTime.now().setZone('America/Mexico_City');
            const nowStr = now.toISO()?.substring(0, 16);
            
            // Detection Phase - get all pending reminders and filter in JS for robustness
            const allPending = await listAllPendingReminders();
            
            const due: any[] = [];
            for (const r of allPending) {
                let reminderTime = r.time;
                
                // Handle "inmediato" or "ahora"
                if (reminderTime === 'inmediato' || reminderTime === 'ahora' || reminderTime === 'inmediatamente') {
                    due.push(r);
                    continue;
                }

                // Handle natural language like "mañana a las 10am" (minimal implementation)
                if (reminderTime.includes('mañana')) {
                    const tomorrow = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
                    const timeMatch = reminderTime.match(/(\d{1,2}):(\d{2})/);
                    const timePart = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '08:00';
                    reminderTime = `${tomorrow}T${timePart}`;
                }
                
                if (reminderTime.length === 5 && reminderTime.includes(':')) {
                    // Handle "HH:mm" -> prepend today
                    reminderTime = `${now.toFormat('yyyy-MM-dd')}T${reminderTime}`;
                }

                const rDateTime = DateTime.fromISO(reminderTime).setZone('America/Mexico_City');
                const diffMinutes = now.diff(rDateTime, 'minutes').minutes;

                if (rDateTime.isValid && rDateTime <= now) {
                    // Si el recordatorio tiene más de 5 minutos de retraso, no lo enviamos automáticamente
                    if (diffMinutes > 5) {
                        console.warn(`[Scheduler] Saltando ${r.id}: Fecha expirada (${diffMinutes.toFixed(1)} min de retraso).`);
                        await this.reminderService.updateStatus(r.id, 'failed');
                        await this.reminderService.logAudit('system', 'REMINDER_EXPIRED_SKIPPED', { id: r.id, delay: diffMinutes });
                        continue;
                    }
                    due.push(r);
                }
            }

            if (due.length > 0) {
                console.log(`[Scheduler] [Audit] Iniciando proceso para ${due.length} recordatorios.`);
                await this.reminderService.logAudit('system', 'SCHEDULER_BATCH_START', { count: due.length });
                await this.asyncBatch(due);
                await this.reminderService.logAudit('system', 'SCHEDULER_BATCH_COMPLETE', { count: due.length });
            }
        } catch (error: any) {
            console.error("[Scheduler] Error en el ciclo de revisión:", error);
            await this.reminderService.logAudit('system', 'SCHEDULER_CRITICAL_ERROR', { error: error.message });
        } finally {
            this.isChecking = false;
        }
    }

    private static async checkUploadCleanup() {
        try {
            const fs = require('fs');
            const path = require('path');
            const uploadDir = path.resolve('data/uploads');
            if (!fs.existsSync(uploadDir)) return;
            
            const files = fs.readdirSync(uploadDir);
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            // Querying pending reminders to avoid deleting active media
            const mediaPaths = await listPendingMediaPaths();
            const activePaths = new Set(
                mediaPaths
                    .map((p: string) => path.normalize(p))
            );
            
            let deleted = 0;
            files.forEach((file: string) => {
                const fullPath = path.join(uploadDir, file);
                const normalizedFullPath = path.normalize(fullPath);
                try {
                    const stats = fs.statSync(fullPath);
                    // Delete if older than 30 days and NOT currently used in a pending reminder
                    if (!activePaths.has(normalizedFullPath) && (now - stats.mtimeMs > THIRTY_DAYS_MS)) {
                        fs.unlinkSync(fullPath);
                        deleted++;
                    }
                } catch(e) {}
            });
            if (deleted > 0) {
                console.log(`[Scheduler] Cleaned up ${deleted} old media files.`);
            }
        } catch (error) {
            console.error("[Scheduler] Error in cleanup cycle:", error);
        }
    }

    private static async checkSheetsSync() {
        try {
            const dbManager = require('../../core/dbManager');
            const settings = await dbManager.getSheetSyncSettings();
            if (!settings || !settings.isActive || settings.syncInterval === 'manual') return;

            const now = new Date();
            const lastSync = settings.lastSyncTime ? new Date(settings.lastSyncTime) : new Date(0);
            const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;

            let shouldSync = false;
            if (settings.syncInterval === '15m' && diffMinutes >= 15) shouldSync = true;
            if (settings.syncInterval === '1h' && diffMinutes >= 60) shouldSync = true;
            if (settings.syncInterval === '12h' && diffMinutes >= 720) shouldSync = true;

            if (shouldSync) {
                console.log("[Scheduler] Ejecutando sincronización automática de Google Sheets...");
                const service = new GoogleSheetsService();
                const result = await service.syncNow();
                if (result.success) {
                    console.log(`[Scheduler] Sincronización Google Sheets exitosa. Importadas: ${result.count}`);
                } else {
                    console.error(`[Scheduler] Fallo sincronización Google Sheets: ${result.message}`);
                }
            }
        } catch (error) {
            console.error("[Scheduler] Error en el job the Google Sheets Sync:", error);
        }
    }

    static async sendNow(reminderId: number) {
        const reminder = await getReminderById(reminderId);
        if (!reminder) throw new Error("Recordatorio no encontrado");
        if (reminder.status === 'sent') throw new Error("Este recordatorio ya fue enviado");

        await this.asyncBatch([reminder]);
    }
}
