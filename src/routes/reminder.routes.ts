import { Router } from 'express';
import multer from 'multer';
import { ReminderController } from '../modules/reminders/reminder.controller';

export function createReminderRouter(controller: ReminderController, upload: multer.Multer) {
    const router = Router();
    
    router.get('/', controller.list);
    router.post('/', controller.create);
    router.post('/with-media', upload.array('media', 10), controller.createWithMedia);
    router.post('/bulk/fix-dates', controller.fixDates);
    router.post('/bulk/scan-folder', controller.scanFolder);
    router.delete('/bulk', controller.bulkDelete);
    router.delete('/:id', controller.delete);
    router.patch('/:id', controller.update);
    router.post('/:id/send-now', controller.sendNow);
    
    return router;
}
