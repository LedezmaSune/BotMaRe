import { Request, Response } from 'express';
import path from 'path';
import { MassDiffusionService } from './diffusion.service';
import { asyncHandler } from '../../middleware/errorHandler';

export class DiffusionController {
    constructor(private diffusionService: MassDiffusionService) {}

    sendMass = asyncHandler(async (req: Request, res: Response) => {
        let contacts = [];
        try {
            const parsed = JSON.parse(req.body.contacts);
            if (typeof parsed[0] === 'string') {
                contacts = parsed.map((p: string) => ({ number: p, name: '' }));
            } else {
                contacts = parsed;
            }
        } catch (e) {
            return res.status(400).json({ success: false, error: "Invalid contacts format" });
        }

        const rawMessage = req.body.message;

        if (!Array.isArray(contacts) || contacts.length === 0 || !rawMessage) {
            return res.status(400).json({ success: false, error: "Invalid payload: contacts and message are required" });
        }

        const files = (req as any).files as any[];
        const mediaFiles = files && files.length > 0 ? files.map(file => ({
            path: path.resolve(file.path),
            type: file.mimetype,
            name: file.originalname
        })) : undefined;

        const queuedCount = await this.diffusionService.sendMass(contacts, rawMessage, mediaFiles);
        
        if (queuedCount === -1) {
            return res.status(409).json({ 
                success: false, 
                error: "Ya hay una difusión en curso. Por favor espera a que termine o revisa el progreso en el dashboard." 
            });
        }

        res.json({ success: true, queued: queuedCount });
    });

    cancel = asyncHandler(async (req: Request, res: Response) => {
        const success = this.diffusionService.stopProcessing();
        res.json({ success });
    });
}
