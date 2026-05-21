import { MessageService } from './message.service';
import { AIService } from '../ai/ai.service';

/**
 * MODULE LAYER - MESSAGES CONTROLLER
 * El controlador orquestra el flujo de los mensajes.
 */
export class MessageController {
    constructor(
        private messageService: MessageService,
        private aiService: AIService
    ) {}

    async handleIncoming(jid: string, text: string, sender: string) {
        const isGroup = jid.endsWith('@g.us');
        const chatType = isGroup ? 'GRUPO' : 'PERSONAL';
        
        console.log(`\n=================== MENSAJE ENTRANTE [${chatType}] ===================`);
        if (isGroup) {
            console.log(`💬 Grupo ID: ${jid}`);
            console.log(`👤 Miembro:  ${sender}`);
        } else {
            console.log(`👤 De:       ${sender}`);
        }
        console.log(`✉️ Mensaje:  "${text}"`);
        console.log(`======================================================================`);

        try {
            // 1. Obtener respuesta de la IA
            const response = await this.aiService.runAgent(jid, text, sender);
            
            console.log(`\n=================== RESPUESTA IA [${chatType}] ===================`);
            console.log(`🎯 Para:      ${jid}`);
            console.log(`🤖 Respuesta: "${response}"`);
            console.log(`======================================================================\n`);

            // 2. Enviar respuesta vía WhatsApp
            await this.messageService.sendMessage(jid, response);

        } catch (error) {
            console.error('[MessageController] Error handling incoming message:', error);
            try {
                await this.messageService.sendMessage(jid, 'Ups, tuve un error interno al procesar tu mensaje.');
            } catch (sendError) {
                console.error('[MessageController] Failed to send error feedback message:', sendError);
            }
        }
    }
}
