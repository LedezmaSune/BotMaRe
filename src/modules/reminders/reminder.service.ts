import fs from 'fs';
import path from 'path';
import { 
    createReminder, 
    listReminders, 
    deleteReminder, 
    updateReminderStatus, 
    logAudit,
    deleteRemindersBulk
} from '../../core/memory';
import { Reminder } from '../../types';

export class ReminderService {
    async bulkDelete(userId: string, type: 'all' | 'pending' | 'sent') {
        return await deleteRemindersBulk(userId, type);
    }
    async create(userId: string, chatId: string, text: string, time: string, mediaPath?: string, mediaType?: string, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string) {
        let finalPath = mediaPath;
        let finalType = mediaType;

        // Lógica de "Ruta Portátil": Si la ruta no existe, buscamos el archivo en uploads local
        if (finalPath && !fs.existsSync(finalPath)) {
            const fileName = path.basename(finalPath);
            const uploadsDir = path.resolve('data/uploads');
            let localPath = path.join(uploadsDir, fileName);
            
            // Intento 1: Coincidencia exacta
            if (!fs.existsSync(localPath)) {
                // Intento 2: Buscar archivos que se parezcan (ignorando codificación corrupta)
                if (fs.existsSync(uploadsDir)) {
                    const filesInDir = fs.readdirSync(uploadsDir);
                    // Buscamos un archivo que comparta los primeros 15 caracteres (usualmente el ID o fecha)
                    const prefix = fileName.substring(0, 15);
                    const match = filesInDir.find(f => f.startsWith(prefix) || fileName.startsWith(f.substring(0, 15)));
                    
                    if (match) {
                        localPath = path.join(uploadsDir, match);
                        console.log(`[Portability] Coincidencia difusa encontrada: ${match}`);
                    }
                }
            }

            if (fs.existsSync(localPath)) {
                console.log(`[Portability] Reparando ruta: ${finalPath} -> ${localPath}`);
                finalPath = localPath;
                
                if (!finalType) {
                    const ext = path.extname(localPath).toLowerCase();
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
