import { Router, Request, Response } from 'express';
import os from 'os';
import { listPausedChats, unpauseChat } from '../core/memory';
import { asyncHandler } from '../middleware/errorHandler';

export function createSupportRouter() {
    const router = Router();

    // GET /api/support/paused-chats
    router.get('/paused-chats', asyncHandler(async (req: Request, res: Response) => {
        const chats = await listPausedChats();
        res.json(chats);
    }));

    // POST /api/support/unpause
    router.post('/unpause', asyncHandler(async (req: Request, res: Response) => {
        const { chatId } = req.body;
        if (!chatId) {
            return res.status(400).json({ error: 'chatId is required' });
        }
        await unpauseChat(chatId);
        res.json({ success: true, message: 'Chat reactivated successfully' });
    }));

    // GET /api/support/health
    router.get('/health', asyncHandler(async (req: Request, res: Response) => {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const uptime = process.uptime();
        const cpuUsage = os.loadavg()[0]; // 1 minute load average

        res.json({
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                percentage: Math.round((usedMem / totalMem) * 100)
            },
            cpu: cpuUsage,
            uptime: uptime
        });
    }));

    // GET /api/support/logs
    // We fetch logs from the audits table to provide recent activity without reading large PM2 logs
    router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
        const { db } = require('../core/memory');
        const audits = db.prepare('SELECT * FROM audits ORDER BY timestamp DESC LIMIT 50').all();
        res.json(audits);
    }));

    return router;
}
