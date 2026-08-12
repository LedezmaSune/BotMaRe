import { Router } from 'express';
import { SystemController } from '../modules/system/system.controller';
import { secureUpload } from '../middleware/fileUpload';
import fs from 'fs';
import path from 'path';

// Configuración de multer local removida en favor de secureUpload global

export function createSystemRouter(controller: SystemController) {
    const router = Router();
    
    router.get('/audits', controller.getAudits);
    router.delete('/clean-uploads', controller.cleanUploads);
    router.post('/reset-whatsapp', controller.resetWhatsApp);
    router.get('/network', controller.getNetworkStatus);
    
    router.get('/check-update', controller.checkUpdates);
    router.post('/apply-update', controller.applyUpdate);
    router.get('/releases', controller.getReleases);
    router.get('/backup', controller.downloadBackup);
    router.get('/export-readable', controller.exportReadable);
    router.get('/telemetry', controller.getTelemetry);
    router.get('/notifications', controller.getNotifications);
    router.delete('/notifications', controller.clearNotifications);
    
    router.post('/upload-multiple', secureUpload.any(), (req, res) => {
        const reqFiles = (req.files as any[]) || [];
        if (reqFiles.length === 0) {
            return res.status(400).json({ success: false, error: 'No se recibieron archivos. Asegúrate de seleccionar archivos válidos.' });
        }

        const files = reqFiles.map(f => ({
            name: f.originalname,
            path: f.path.replace(/\\/g, '/')
        }));
        
        res.json({ 
            success: true, 
            message: `${files.length} archivos subidos correctamente a data/uploads.`,
            files 
        });
    });
    
    router.post('/restore', secureUpload.single('backup'), controller.restoreBackup);
    
    return router;
}
