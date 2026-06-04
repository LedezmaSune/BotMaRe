import { Request, Response } from 'express';
import { AIService } from './ai.service';
import { asyncHandler } from '../../middleware/errorHandler';

export class AIController {
    constructor(private aiService: AIService) {}

    reviewMessage = asyncHandler(async (req: Request, res: Response) => {
        const { text, mode } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: "Text is required" });
        }
        
        console.log(`[AI Controller] Reviewing message (mode: ${mode || 'standard'})...`);
        const corrected = await this.aiService.reviewMessage(text, mode);
        res.json({ success: true, corrected });
    });

    perfectMessage = asyncHandler(async (req: Request, res: Response) => {
        const { text, mode } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: "Text is required" });
        }
        
        console.log(`[AI Controller] Perfecting message (mode: ${mode || 'standard'})...`);
        const perfected = await this.aiService.reviewMessage(text, mode);
        res.json({ success: true, perfected });
    });
}
