import { Router } from 'express';
import { WhatsAppController } from '../modules/messages/whatsapp.controller';

export function createWhatsAppRouter(controller: WhatsAppController) {
    const router = Router();
    
    router.get('/status', controller.getStatus);
    router.post('/send', controller.sendMessage);
    router.post('/disconnect', controller.disconnect);
    router.get('/groups', controller.getGroups);
    router.post('/pairing-code', controller.requestPairingCode);
    
    return router;
}
