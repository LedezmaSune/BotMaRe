import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getSettings, updateSettings, listReminders } from '../../core/memory';
import { asyncHandler } from '../../middleware/errorHandler';
import { scrapeUrl } from '../../core/scraper';
import { getAllConfig } from '../../core/config';

const uploadDir = path.resolve('data/uploads');

export class SettingsController {
    constructor(private waClient?: any) {}

    getSettings = asyncHandler(async (req: Request, res: Response) => {
        const settings = await getAllConfig();
        res.json(settings);
    });

    updateSettings = asyncHandler(async (req: Request, res: Response) => {
        await updateSettings(req.body);
        
        // Sincronizar el nombre del bot con el perfil de WhatsApp si está conectado
        if (req.body.bot_name && this.waClient) {
            try {
                const socket = this.waClient.getSocket?.();
                if (socket && typeof socket.updateProfileName === 'function') {
                    console.log(`[SettingsController] Actualizando nombre de perfil de WhatsApp a: ${req.body.bot_name}`);
                    await socket.updateProfileName(req.body.bot_name);
                }
            } catch (e: any) {
                console.error('[SettingsController] Error al sincronizar el nombre de perfil de WhatsApp:', e.message);
            }
        }
        
        res.json({ success: true });
    });

    parseEnvFile = asyncHandler(async (req: Request, res: Response) => {
        const { content } = req.body;
        if (!content) throw new Error("Content is required");

        const lines = content.split('\n');
        const parsed: Record<string, string> = {};
        
        lines.forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                parsed[key.trim()] = value;
            }
        });

        await updateSettings(parsed);
        res.json({ success: true, count: Object.keys(parsed).length });
    });

    cleanUploads = asyncHandler(async (req: Request, res: Response) => {
        if (!fs.existsSync(uploadDir)) return res.json({ success: true, deletedCount: 0 });
        
        const files = fs.readdirSync(uploadDir);
        let deletedCount = 0;
        const pendingReminders = await listReminders('owner');
        // Keep media linked to pending reminders
        const activePaths = new Set(pendingReminders.map((r: any) => r.mediaPath).filter(Boolean));
        
        files.forEach(file => {
            const fullPath = path.join(uploadDir, file);
            if (!activePaths.has(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                    deletedCount++;
                } catch (e) {
                    console.error("Could not delete file", fullPath, e);
                }
            }
        });
        res.json({ success: true, deletedCount });
    });
    learnFromUrl = asyncHandler(async (req: Request, res: Response) => {
        const { url } = req.body;
        if (!url) throw new Error("URL is required");

        const content = await scrapeUrl(url);
        
        // Fetch current knowledge or possible responses
        const settings = await getSettings() as any;
        const currentKnowledge = settings.possible_responses || "";
        
        const newKnowledge = `${currentKnowledge}\n\n[CONOCIMIENTO DE ${url}]:\n${content}`;
        
        await updateSettings({ possible_responses: newKnowledge });
        
        res.json({ success: true, learnedCount: content.length });
    });
}

