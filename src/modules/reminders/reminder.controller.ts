import { Request, Response } from 'express';
import path from 'path';
import { ReminderService } from './reminder.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { Scheduler } from '../scheduling/scheduler';
import { db } from '../../core/memory';

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
        const file = req.file;

        let mediaType;
        if (file) {
            if (file.mimetype.startsWith('image/')) mediaType = 'image';
            else if (file.mimetype.startsWith('video/')) mediaType = 'video';
            else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'document';
        }

        const mediaPath = file ? path.resolve(file.path) : undefined;
        const id = await this.reminderService.create('owner', chatId, text, time, mediaPath, mediaType, repeat, repeatInterval ? parseInt(repeatInterval) : undefined, repeatUnit, title);
        res.json({ success: true, id, mediaPath });
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
        
        db.prepare('UPDATE reminders SET chatId = ?, text = ?, time = ?, repeat = ?, repeatInterval = ?, repeatUnit = ?, title = ? WHERE id = ?')
          .run(chatId, text, time, repeat || 'none', repeatInterval || null, repeatUnit || null, title || null, id);
          
        res.json({ success: true });
    });

    sendNow = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        await Scheduler.sendNow(parseInt(id as string));
        res.json({ success: true });
    });

    fixDates = asyncHandler(async (req: Request, res: Response) => {
        const reminders = db.prepare("SELECT id, time FROM reminders WHERE status IN ('pending', 'failed')").all() as { id: number, time: string }[];
        
        let fixed = 0;
        let deleted = 0;
        const currentYear = new Date().getFullYear().toString();

        const updateStmt = db.prepare("UPDATE reminders SET time = ?, status = 'pending' WHERE id = ?");
        const deleteStmt = db.prepare("DELETE FROM reminders WHERE id = ?");

        for (const r of reminders) {
            if (r.time && r.time.match(/^\d{4}-/)) {
                const newTimeStrLocal = r.time.replace(/^\d{4}/, currentYear);
                const checkDate = new Date(newTimeStrLocal);
                
                if (checkDate < new Date()) {
                    deleteStmt.run(r.id);
                    deleted++;
                } else {
                    updateStmt.run(newTimeStrLocal, r.id);
                    fixed++;
                }
            }
        }

        res.json({ success: true, fixed, deleted });
    });
}
