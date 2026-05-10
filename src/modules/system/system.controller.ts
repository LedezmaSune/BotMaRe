import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db, listReminders } from '../../core/memory';
import { asyncHandler } from '../../middleware/errorHandler';
import { UpdateService } from './update.service';

const uploadDir = path.resolve('data/uploads');

export class SystemController {
    private updateService = new UpdateService();
    constructor(private waClient?: any) {}

    getAudits = asyncHandler(async (req: Request, res: Response) => {
        const audits = db
            .prepare('SELECT id, userId, action, details, timestamp FROM audits ORDER BY timestamp DESC LIMIT 50')
            .all();
        res.json(audits);
    });

    cleanUploads = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        await BackupService.cleanOldUploads(0); // 0 días para limpieza manual inmediata
        res.json({ success: true, message: 'Multimedia no utilizada eliminada con éxito.' });
    });

    resetWhatsApp = asyncHandler(async (req: Request, res: Response) => {
        console.log('[System] Resetting WhatsApp requested...');
        
        // 1. Disconnect current client if possible
        if (this.waClient) {
            try {
                await this.waClient.disconnect();
            } catch (e) {
                console.warn('[System] Error disconnecting client (ignoring):', e);
            }
        }

        // 2. Clear auth folder
        const authDir = path.resolve('auth_info_baileys');
        if (fs.existsSync(authDir)) {
            console.log('[System] Clearing auth_info_baileys folder...');
            fs.rmSync(authDir, { recursive: true, force: true });
            fs.mkdirSync(authDir);
        }

        // 3. Re-initialize client
        if (this.waClient) {
            console.log('[System] Re-initializing WhatsApp client...');
            // We run it asynchronously to avoid blocking the response
            void this.waClient.init();
        }

        res.json({ success: true, message: 'WhatsApp session reset initiated.' });
    });
    checkUpdates = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.updateService.checkUpdate();
        res.json(result);
    });

    applyUpdate = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.updateService.performUpdate();
        res.json(result);
    });

    downloadBackup = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        try {
            const filePath = await BackupService.createBackup(true); // Enviar a Telegram también
            res.download(filePath, path.basename(filePath), (err) => {
                if (err) {
                    console.error('Error al descargar backup:', err);
                }
                // Limpiar el archivo local después de descargar (opcional, BackupService ya tiene limpieza cron)
            });
        } catch (error) {
            console.error('Error generando backup:', error);
            res.status(500).json({ error: 'Error al generar el respaldo.' });
        }
    });

    restoreBackup = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ error: 'No se subió ningún archivo de respaldo.' });
        }

        try {
            const result = await BackupService.restoreBackup(file.path);
            
            // Eliminar el archivo temporal subido
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            res.json(result);
        } catch (error: any) {
            console.error('Error restaurando backup:', error);
            res.status(500).json({ error: error.message || 'Error al restaurar el respaldo.' });
        }
    });
    exportReadable = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        try {
            const filePath = await BackupService.createHumanReadableBackup();
            res.download(filePath, path.basename(filePath));
        } catch (error) {
            console.error('Error exportando datos legibles:', error);
            res.status(500).json({ error: 'Error al exportar los datos.' });
        }
    });
}
