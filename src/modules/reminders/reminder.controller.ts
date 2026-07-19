import { Request, Response } from 'express';
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

export class ReminderController {
    constructor(private reminderService: ReminderService) {}

    list = asyncHandler(async (req: Request, res: Response) => {
        const reminders = await this.reminderService.list('owner', true);
        res.json(reminders);
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const { chatId, text, time, repeat, repeatInterval, repeatUnit, title, mediaPath, mediaType } = req.body;
        const id = await this.reminderService.create('owner', chatId, text, time, mediaPath, mediaType, repeat, repeatInterval, repeatUnit, title);
        res.json({ success: true, id });
    });

    createWithMedia = asyncHandler(async (req: Request, res: Response) => {
        const { chatId, text, time, repeat, repeatInterval, repeatUnit, title } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            const id = await this.reminderService.create('owner', chatId, text, time, undefined, undefined, repeat, repeatInterval ? parseInt(repeatInterval) : undefined, repeatUnit, title);
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
            
            const id = await this.reminderService.create('owner', chatId, textForThisFile, time, mediaPath, mediaType, repeat, repeatInterval ? parseInt(repeatInterval) : undefined, repeatUnit, title);
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
        const { chatId, text, time, repeat, repeatInterval, repeatUnit, title } = req.body;
        
        const updateData: any = {
            chatId,
            text,
            time,
            repeat: repeat || 'none',
            repeatInterval: repeatInterval ? parseInt(repeatInterval) : undefined,
            repeatUnit: repeatUnit || undefined,
            title: title || undefined
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
        let deleted = 0;
        const currentYear = new Date().getFullYear().toString();

        for (const r of reminders) {
            if (r.time && r.time.match(/^\d{4}-/)) {
                const newTimeStrLocal = r.time.replace(/^\d{4}/, currentYear);
                const checkDate = new Date(newTimeStrLocal);
                
                if (checkDate < new Date()) {
                    await deleteReminder(r.id);
                    deleted++;
                } else {
                    await updateReminder(r.id, { time: newTimeStrLocal, status: 'pending' });
                    fixed++;
                }
            }
        }

        res.json({ success: true, fixed, deleted });
    });

    scanFolder = asyncHandler(async (req: Request, res: Response) => {
        const { globalChatId, globalTime, globalText } = req.body;
        
        const uploadsDir = path.resolve('data/uploads');
        let fsLib;
        try {
            fsLib = require('fs');
            if (!fsLib.existsSync(uploadsDir)) {
                return res.json({ success: true, added: 0, message: 'Uploads directory does not exist' });
            }
        } catch (e) {
            return res.json({ success: false, error: 'Could not access file system' });
        }

        const files = fsLib.readdirSync(uploadsDir);
        let added = 0;
        
        // Expresión regular inteligente: Busca DD y MM (y opcionalmente YYYY) ignorando separadores (. - _ / espacio)
        // Ejemplo: 15.08, 15-08, 15_08_2026, 15 08
        const dateRegex = /^(\d{2})[.\-_\s\/]+(\d{2})(?:[.\-_\s\/]+(\d{4}|\d{2}))?\b/;
        
        const currentYear = new Date().getFullYear();

        for (const file of files) {
            const match = file.match(dateRegex);
            if (match) {
                const day = match[1];
                const month = match[2];
                const yearMatch = match[3];
                let year = currentYear;
                
                if (yearMatch) {
                    year = yearMatch.length === 2 ? 2000 + parseInt(yearMatch) : parseInt(yearMatch);
                }
                
                const timeStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${globalTime || '09:00'}`;
                
                // Asegurar ruta correcta
                const mediaPath = path.join(uploadsDir, file).replace(/\\/g, '/');
                
                // Verificar si ya existe un recordatorio con esta imagen
                const exists = await checkReminderExistsByMediaPath(mediaPath);
                if (!exists) {
                    // Determinar tipo de medio
                    let mediaType = 'document';
                    const ext = path.extname(file).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) mediaType = 'image';
                    else if (['.mp4', '.avi', '.mov'].includes(ext)) mediaType = 'video';
                    else if (['.mp3', '.ogg', '.wav'].includes(ext)) mediaType = 'audio';

                    // Texto personalizado o default
                    let text = globalText || 'Adjunto archivo: {ARCHIVO}';
                    text = text.replace('{ARCHIVO}', file);

                    await createReminder('owner', globalChatId || '', text, timeStr, mediaPath, mediaType, 'none', undefined, undefined, undefined, 'pending');
                    added++;
                }
            }
        }

        res.json({ success: true, added });
    });
}
