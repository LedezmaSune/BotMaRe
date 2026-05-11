import fs from 'fs';
import path from 'path';
import { 
    createReminder, 
    listReminders, 
    deleteReminder, 
    updateReminderStatus, 
    logAudit 
} from '../../core/memory';
import { Reminder } from '../../types';

export class ReminderService {
    async create(userId: string, chatId: string, text: string, time: string, mediaPath?: string, mediaType?: string, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string) {
        let finalPath = mediaPath;
        let finalType = mediaType;

        // Lógica de "Ruta Portátil": Si la ruta no existe, buscamos el archivo en uploads local
        if (finalPath && !fs.existsSync(finalPath)) {
            const fileName = path.basename(finalPath);
            const localPath = path.resolve('data/uploads', fileName);
            
            if (fs.existsSync(localPath)) {
                console.log(`[Portability] Reparando ruta: ${finalPath} -> ${localPath}`);
                finalPath = localPath;
                
                // Si no tiene tipo, intentamos deducirlo
                if (!finalType) {
                    const ext = path.extname(fileName).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) finalType = 'image';
                    else if (['.mp4', '.avi', '.mov'].includes(ext)) finalType = 'video';
                    else if (['.mp3', '.ogg', '.wav'].includes(ext)) finalType = 'audio';
                    else finalType = 'document';
                }
            }
        }

        // Aseguramos que las barras sean normales para evitar problemas de escape en JSON
        if (finalPath) finalPath = finalPath.replace(/\\/g, '/');

        return await createReminder(userId, chatId, text, time, finalPath, finalType, repeat, repeatInterval, repeatUnit, title);
    }

    async list(userId: string, includeProcessed: boolean = false): Promise<Reminder[]> {
        return await listReminders(userId, includeProcessed) as Reminder[];
    }

    async delete(id: number) {
        return await deleteReminder(id);
    }

    async updateStatus(id: number, status: Reminder['status']) {
        return await updateReminderStatus(id, status);
    }

    async logAudit(userId: string, action: string, details: any) {
        return await logAudit(userId, action, details);
    }
}
