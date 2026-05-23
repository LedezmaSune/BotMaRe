import { Router } from 'express';
import multer from 'multer';
import { DiffusionController } from '../modules/messages/diffusion.controller';

export function createDiffusionRouter(controller: DiffusionController, upload: multer.Multer) {
    const router = Router();
    
    router.post('/', upload.array('media', 10), controller.sendMass);
    router.post('/cancel', controller.cancel);
    
    return router;
}
