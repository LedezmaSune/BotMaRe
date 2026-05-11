import { Router } from 'express';
import { SystemController } from '../modules/system/system.controller';
import multer from 'multer';

import fs from 'fs';
import path from 'path';

const uploadDir = path.resolve('backups/temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        const dir = path.resolve('data/uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req: any, file: any, cb: any) => {
        // Mantenemos el nombre original para compatibilidad con importaciones masivas
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

export function createSystemRouter(controller: SystemController) {
    const router = Router();
    
    router.get('/audits', controller.getAudits);
    router.delete('/clean-uploads', controller.cleanUploads);
    router.post('/reset-whatsapp', controller.resetWhatsApp);
    
    router.get('/check-update', controller.checkUpdates);
    router.post('/apply-update', controller.applyUpdate);
    router.get('/backup', controller.downloadBackup);
    router.get('/export-readable', controller.exportReadable);
    
    router.post('/upload-multiple', upload.array('files', 100), (req, res) => {
        const files = (req.files as any[]).map(f => ({
            name: f.originalname,
            path: f.path.replace(/\\/g, '/') // Convertimos barras para portabilidad
        }));
        res.json({ 
            success: true, 
            message: `${files.length} archivos subidos correctamente a data/uploads.`,
            files 
        });
    });
    
    router.post('/restore', upload.single('backup'), controller.restoreBackup);
    
    return router;
}
