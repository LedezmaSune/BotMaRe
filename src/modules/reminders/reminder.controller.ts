import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ReminderService } from './reminder.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { Scheduler } from '../scheduling/scheduler';
import { 
    updateReminder, 
    listPendingOrFailedReminders, 
    deleteReminder, 
    checkReminderExistsByMediaPath, 
    createReminder 
} from '../../core/memory';
import { parseDateFromFilename } from '../../utils/dateParser';

export class ReminderController {
    constructor(private reminderService: ReminderService) {}

    list = asyncHandler(async (req: Request, res: Response) => {
        const reminders = await this.reminderService.list('owner', true);
        res.json(reminders);
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const { chatId, text, time, repeat, repeatInterval, repeatUnit, title, mediaPath, mediaType, channel } = req.body;
        const id = await this.reminderService.create('owner', chatId, text, time, mediaPath, mediaType, repeat, repeatInterval, repeatUnit, title, channel || 'whatsapp');
        res.json({ success: true, id });
    });

    createBulk = asyncHandler(async (req: Request, res: Response) => {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Lista de recordatorios inválida o vacía.' });
        }
        const ids = await this.reminderService.createBulk('owner', items);
        res.json({ success: true, count: ids.length, ids });
    });

    createWithMedia = asyncHandler(async (req: Request, res: Response) => {
        const { chatId, text, time, repeat, repeatInterval, repeatUnit, title, channel } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            const id = await this.reminderService.create('owner', chatId, text, time, undefined, undefined, repeat, repeatInterval ? parseInt(repeatInterval) : undefined, repeatUnit, title, channel || 'whatsapp');
            return res.json({ success: true, id });
        }

        const createdIds = [];
        const mediaPaths = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let mediaType;
            if (file.mimetype.startsWith('image/')) mediaType = 'image';
            else if (file.mimetype.startsWith('video/')) mediaType = 'video';
            else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'document';

            const mediaPath = path.resolve(file.path);
            
            // Solo adjuntamos el texto (caption) al primer archivo para evitar spam si suben muchas fotos
            const textForThisFile = i === 0 ? text : '';
            
            const id = await this.reminderService.create('owner', chatId, textForThisFile, time, mediaPath, mediaType, repeat, repeatInterval ? parseInt(repeatInterval) : undefined, repeatUnit, title, channel || 'whatsapp');
            createdIds.push(id);
            mediaPaths.push(mediaPath);
        }

        res.json({ success: true, ids: createdIds, mediaPaths });
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        await this.reminderService.delete(parseInt(id as string));
        res.json({ success: true });
    });

    bulkDelete = asyncHandler(async (req: Request, res: Response) => {
        const { type } = req.query;
        await this.reminderService.bulkDelete('owner', (type as any) || 'all');
        res.json({ success: true });
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        const { chatId, text, time, repeat, repeatInterval, repeatUnit, title, channel } = req.body;
        
        const updateData: any = {
            chatId,
            text,
            time,
            repeat: repeat || 'none',
            repeatInterval: repeatInterval ? parseInt(repeatInterval) : undefined,
            repeatUnit: repeatUnit || undefined,
            title: title || undefined,
            channel: channel || 'whatsapp'
        };

        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
            const file = files[0];
            let mediaType;
            if (file.mimetype.startsWith('image/')) mediaType = 'image';
            else if (file.mimetype.startsWith('video/')) mediaType = 'video';
            else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'document';

            updateData.mediaPath = path.resolve(file.path);
            updateData.mediaType = mediaType;
        }
        
        await updateReminder(parseInt(id as string), updateData);
          
        res.json({ success: true });
    });

    sendNow = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        await Scheduler.sendNow(parseInt(id as string));
        res.json({ success: true });
    });

    fixDates = asyncHandler(async (req: Request, res: Response) => {
        const reminders = await listPendingOrFailedReminders();
        
        let fixed = 0;
        const now = new Date();
        const currentYear = now.getFullYear();

        for (const r of reminders) {
            if (r.time && r.time.match(/^\d{4}-/)) {
                const parts = r.time.split('T');
                const dateParts = parts[0].split('-');
                const month = parseInt(dateParts[1], 10);
                const day = parseInt(dateParts[2], 10);
                const timePart = parts[1] || '09:00';

                // Si la fecha en el año actual ya pasó, agendamos para el año próximo de manera segura
                const targetThisYear = new Date(currentYear, month - 1, day, 23, 59, 59);
                let targetYear = currentYear;
                if (targetThisYear.getTime() < now.getTime()) {
                    targetYear = currentYear + 1;
                }

                const newTimeStrLocal = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${timePart}`;
                await updateReminder(r.id, { time: newTimeStrLocal, status: 'pending' });
                fixed++;
            }
        }

        res.json({ success: true, fixed, deleted: 0 });
    });

    scanFolder = asyncHandler(async (req: Request, res: Response) => {
        const { globalChatId, globalTime, globalText, channel } = req.body;
        
        const uploadsDir = path.resolve('data/uploads');
        if (!fs.existsSync(uploadsDir)) {
            return res.json({ success: true, added: 0, message: 'El directorio data/uploads no existe.' });
        }

        const files = fs.readdirSync(uploadsDir);
        let added = 0;

        for (const file of files) {
            const parsed = parseDateFromFilename(file, globalTime || '09:00');
            if (parsed) {
                const mediaPath = path.join(uploadsDir, file).replace(/\\/g, '/');
                
                // Verificar si ya existe un recordatorio con este archivo
                const exists = await checkReminderExistsByMediaPath(mediaPath);
                if (!exists) {
                    let mediaType = 'document';
                    const ext = path.extname(file).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) mediaType = 'image';
                    else if (['.mp4', '.avi', '.mov'].includes(ext)) mediaType = 'video';
                    else if (['.mp3', '.ogg', '.wav'].includes(ext)) mediaType = 'audio';

                    let text = globalText || 'Adjunto archivo: {ARCHIVO}';
                    text = text.replace('{ARCHIVO}', file);

                    await createReminder(
                        'owner',
                        globalChatId || '',
                        text,
                        parsed.time,
                        mediaPath,
                        mediaType,
                        'none',
                        undefined,
                        undefined,
                        file,
                        'pending',
                        channel || 'whatsapp'
                    );
                    added++;
                }
            }
        }

        res.json({ success: true, added });
    });
}
