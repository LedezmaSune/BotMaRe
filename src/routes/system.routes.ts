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
    destination: (req: any, file: any, cb: any) => cb(null, uploadDir),
    filename: (req: any, file: any, cb: any) => cb(null, `${Date.now()}-${file.originalname}`)
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
    router.post('/restore', upload.single('backup'), controller.restoreBackup);
    
    return router;
}
