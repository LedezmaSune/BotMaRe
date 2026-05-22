import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WhatsAppClient } from '../infrastructure/whatsapp/client';

// Services
import { MessageService } from '../modules/messages/message.service';
import { ReminderService } from '../modules/reminders/reminder.service';
import { AIService } from '../modules/ai/ai.service';
import { MassDiffusionService } from '../modules/messages/diffusion.service';

// Controllers
import { WhatsAppController } from '../modules/messages/whatsapp.controller';
import { ReminderController } from '../modules/reminders/reminder.controller';
import { AIController } from '../modules/ai/ai.controller';
import { DiffusionController } from '../modules/messages/diffusion.controller';
import { SettingsController } from '../modules/settings/settings.controller';
import { SystemController } from '../modules/system/system.controller';
import { TemplateController } from '../modules/templates/template.controller';
import { AutoresponderController } from '../modules/autoresponders/autoresponder.controller';

// Routes
import { createWhatsAppRouter } from './whatsapp.routes';
import { createReminderRouter } from './reminder.routes';
import { createAIRouter } from './ai.routes';
import { createDiffusionRouter } from './diffusion.routes';
import { createSettingsRouter } from './settings.routes';
import { createSystemRouter } from './system.routes';
import { createTemplateRouter } from './template.routes';
import { createSupportRouter } from './support.routes';
import { createAutoresponderRouter } from '../modules/autoresponders/autoresponder.routes';

// Shared Multer Setup
const uploadDir = path.resolve('data/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, uploadDir),
    filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

/**
 * Route Aggregator
 * Instantiates all services and controllers to build the main router.
 */
export function createMainRouter(waClient: WhatsAppClient) {
    const router = Router();

    // 1. Instantiate Services
    const waService = new MessageService(waClient);
    const reminderService = new ReminderService();
    const aiService = new AIService();
    const diffusionService = new MassDiffusionService(waService as any);
    
    // Registrar el servicio en el adaptador para que el Bot pueda emitir su estado
    if ((waClient as any).setDiffusionService) {
        (waClient as any).setDiffusionService(diffusionService);
    }

    // 2. Instantiate Controllers
    const waController = new WhatsAppController(waService);
    const reminderController = new ReminderController(reminderService);
    const aiController = new AIController(aiService);
    const diffusionController = new DiffusionController(diffusionService);
    const settingsController = new SettingsController(waClient);
    const systemController = new SystemController(waClient);
    const templateController = new TemplateController();
    const autoresponderController = new AutoresponderController();

    // 3. Mount Routes
    router.use('/whatsapp', createWhatsAppRouter(waController));
    router.use('/reminders', createReminderRouter(reminderController, upload));
    router.use('/ai', createAIRouter(aiController));
    router.use('/send-mass', createDiffusionRouter(diffusionController, upload));
    router.use('/settings', createSettingsRouter(settingsController));
    router.use('/system', createSystemRouter(systemController));
    router.use('/templates', createTemplateRouter(templateController));
    router.use('/support', createSupportRouter());
    router.use('/autoresponders', createAutoresponderRouter(autoresponderController));

    return router;
}
