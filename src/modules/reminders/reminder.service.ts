import fs from 'fs';
import path from 'path';
import { 
    createReminder, 
    createRemindersBulk,
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

    async createBulk(userId: string, items: Array<{
        chatId: string;
        text: string;
        time: string;
        mediaPath?: string;
        mediaType?: string;
        repeat?: string;
        repeatInterval?: number;
        repeatUnit?: string;
        title?: string;
        channel?: 'whatsapp' | 'sms';
    }>) {
        const preparedItems = items.map(item => {
            let finalPath = item.mediaPath;
            let finalType = item.mediaType;

            if (finalPath && !finalPath.startsWith('http://') && !finalPath.startsWith('https://')) {
                const fileName = path.basename(finalPath);
                const uploadsDir = path.resolve('data/uploads');
                let localPath = path.join(uploadsDir, fileName);
                
                if (fs.existsSync(localPath)) {
                    finalPath = localPath;
                    if (!finalType) {
                        const ext = path.extname(localPath).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) finalType = 'image';
                        else if (['.mp4', '.avi', '.mov'].includes(ext)) finalType = 'video';
                        else if (['.mp3', '.ogg', '.wav'].includes(ext)) finalType = 'audio';
                        else finalType = 'document';
                    }
                } else {
                    finalPath = undefined;
                }
            }

            if (finalPath) finalPath = finalPath.replace(/\\/g, '/');

            return {
                chatId: item.chatId,
                text: item.text,
                time: item.time,
                mediaPath: finalPath,
                mediaType: finalType,
                repeat: item.repeat || 'none',
                repeatInterval: item.repeatInterval,
                repeatUnit: item.repeatUnit,
                title: item.title,
                status: 'pending' as const,
                channel: item.channel || 'whatsapp'
            };
        });

        return await createRemindersBulk(userId, preparedItems);
    }
    async create(userId: string, chatId: string, text: string, time: string, mediaPath?: string, mediaType?: string, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string, channel: 'whatsapp' | 'sms' = 'whatsapp') {
        let finalPath = mediaPath;
        let finalType = mediaType;

        // Lógica de "Ruta Portátil": Solo permitimos rutas relativas a uploads o URLs
        if (finalPath && !finalPath.startsWith('http://') && !finalPath.startsWith('https://')) {
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
                console.log(`[Portability] Reparando ruta (Directory Jail aplicable): ${finalPath} -> ${localPath}`);
                finalPath = localPath;
                
                if (!finalType) {
                    const ext = path.extname(localPath).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) finalType = 'image';
                    else if (['.mp4', '.avi', '.mov'].includes(ext)) finalType = 'video';
                    else if (['.mp3', '.ogg', '.wav'].includes(ext)) finalType = 'audio';
                    else finalType = 'document';
                }
            } else {
                finalPath = undefined;
            }
        }

        // Aseguramos que las barras sean normales para evitar problemas de escape en JSON
        if (finalPath) finalPath = finalPath.replace(/\\/g, '/');

        return await createReminder(userId, chatId, text, time, finalPath, finalType, repeat, repeatInterval, repeatUnit, title, 'pending', channel);
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
