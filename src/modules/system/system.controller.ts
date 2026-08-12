import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { listAudits } from '../../core/dbManager';
import { asyncHandler } from '../../middleware/errorHandler';
import { UpdateService } from './update.service';

import { telemetry } from '../../core/telemetry';

const uploadDir = path.resolve('data/uploads');

export class SystemController {
    private updateService = new UpdateService();
    constructor(private waClient?: any) {}

    getTelemetry = asyncHandler(async (req: Request, res: Response) => {
        res.json(telemetry.getData());
    });

    getAudits = asyncHandler(async (req: Request, res: Response) => {
        const audits = await listAudits(50);
        res.json(audits);
    });

    cleanUploads = asyncHandler(async (req: Request, res: Response) => {
        const { BackupService } = require('./backup.service');
        await BackupService.cleanOldUploads(1); // 1 día de gracia para no borrar envíos recientes
        res.json({ success: true, message: 'Multimedia antigua eliminada con éxito.' });
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
        
        // 1. Limpiar credenciales y desconectar socket actual
        if (this.waClient) {
            try {
                if (typeof (this.waClient as any).resetSession === 'function') {
                    await (this.waClient as any).resetSession();
                } else {
                    await this.waClient.disconnect();
                }
            } catch (e) {
                console.warn('[System] Advertencia al resetear sesión de WhatsApp:', e);
            }
        }

        // 2. Intentar remover archivos remanentes de manera segura (tolerante a bloqueos de SO)
        const authDbPath = path.resolve('data/whatsapp_auth.db');
        if (fs.existsSync(authDbPath)) {
            try {
                fs.unlinkSync(authDbPath);
                console.log('[System] Archivo de base de datos de autenticación eliminado.');
            } catch (e) {
                console.log('[System] Base de datos vaciada mediante SQLite (archivo físico retenido temporalmente por el SO).');
            }
        }

        const legacyDir = path.resolve('auth_info_baileys');
        if (fs.existsSync(legacyDir)) {
            try {
                fs.rmSync(legacyDir, { recursive: true, force: true });
            } catch (e) {}
        }

        // 3. Re-inicializar cliente para generar el nuevo código QR inmediatamente
        if (this.waClient) {
            console.log('[System] Re-inicializando cliente para nuevo QR...');
            setTimeout(() => {
                void this.waClient.connect();
            }, 300);
        }

        res.json({ success: true, message: 'Sesión reiniciada con éxito. Generando nuevo código QR en el dashboard...' });
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

    getNotifications = asyncHandler(async (req: Request, res: Response) => {
        const { NotificationHub } = require('../../core/notificationHub');
        res.json({ success: true, notifications: NotificationHub.getHistory() });
    });

    clearNotifications = asyncHandler(async (req: Request, res: Response) => {
        const { NotificationHub } = require('../../core/notificationHub');
        NotificationHub.clearHistory();
        res.json({ success: true, message: 'Historial de notificaciones limpiado.' });
    });
}
