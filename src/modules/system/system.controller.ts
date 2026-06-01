import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { listAudits } from '../../core/dbManager';
import { asyncHandler } from '../../middleware/errorHandler';
import { UpdateService } from './update.service';

const uploadDir = path.resolve('data/uploads');

export class SystemController {
    private updateService = new UpdateService();
    constructor(private waClient?: any) {}

    getAudits = asyncHandler(async (req: Request, res: Response) => {
        const audits = await listAudits(50);
        res.json(audits);
    });

    cleanUploads = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        await BackupService.cleanOldUploads(0); // 0 días para limpieza manual inmediata
        res.json({ success: true, message: 'Multimedia no utilizada eliminada con éxito.' });
    });

    getNetworkStatus = asyncHandler(async (req: Request, res: Response) => {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        let tailscaleIp = null;
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && iface.address.startsWith('100.')) {
                    tailscaleIp = iface.address;
                    break;
                }
            }
        }

        const { TunnelService } = require('../../core/tunnel');
        const cloudflareUrl = TunnelService.getInstance().getUrl();
        const localPort = process.env.PORT || 8000;

        res.json({
            success: true,
            network: {
                cloudflareUrl,
                tailscaleIp,
                localPort
            }
        });
    });

    resetWhatsApp = asyncHandler(async (req: Request, res: Response) => {
        console.log('[System] Resetting WhatsApp session (Full Logout)...');
        
        // 1. Desconectar cliente actual
        if (this.waClient) {
            try {
                await this.waClient.disconnect();
            } catch (e) {
                console.warn('[System] Error al desconectar cliente:', e);
            }
        }

        // 2. Eliminar base de datos de autenticación (SQLite)
        const authDbPath = path.resolve('data/whatsapp_auth.db');
        if (fs.existsSync(authDbPath)) {
            console.log('[System] Eliminando base de datos de autenticación...');
            try {
                fs.unlinkSync(authDbPath);
            } catch (e) {
                console.error('[System] No se pudo eliminar el archivo. Puede que esté bloqueado:', e);
                return res.status(500).json({ success: false, error: 'El archivo de sesión está bloqueado. Por favor, reinicia el servidor manualmente.' });
            }
        }

        // 3. Re-inicializar cliente (esto generará un nuevo QR)
        if (this.waClient) {
            console.log('[System] Re-inicializando cliente para nuevo QR...');
            void this.waClient.connect();
        }

        res.json({ success: true, message: 'Sesión cerrada. Escanea el nuevo QR en el dashboard.' });
    });
    checkUpdates = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.updateService.checkUpdate();
        res.json(result);
    });

    applyUpdate = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.updateService.performUpdate();
        res.json(result);
    });

    getReleases = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.updateService.fetchReleases();
        res.json(result);
    });

    downloadBackup = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        try {
            const filePaths = await BackupService.createBackup(true); // Genera ambos y los envía a Telegram
            
            // Para la descarga del navegador, enviamos la PARTE 1 (Sistema) por defecto
            // ya que el navegador no puede descargar dos archivos a la vez sin empaquetarlos,
            // y queremos mantenerlos independientes.
            const coreBackup = Array.isArray(filePaths) ? filePaths[0] : filePaths;
            
            res.download(coreBackup, path.basename(coreBackup), (err) => {
                if (err) console.error('Error al descargar backup en navegador:', err);
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
