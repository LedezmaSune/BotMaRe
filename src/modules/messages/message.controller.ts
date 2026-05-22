import { MessageService } from './message.service';
import { AIService } from '../ai/ai.service';
import { AutoresponderService } from '../autoresponders/autoresponder.service';
import { processVariables } from '../../utils/variables';

/**
 * MODULE LAYER - MESSAGES CONTROLLER
 * El controlador orquestra el flujo de los mensajes.
 */
export class MessageController {
    private autoresponderService: AutoresponderService;

    constructor(
        private messageService: MessageService,
        private aiService: AIService
    ) {
        this.autoresponderService = new AutoresponderService();
    }

    async handleIncoming(jid: string, text: string, sender: string, senderName: string = '') {
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
            // 0. Autoresponders
            const autoresponderMatch = await this.autoresponderService.match(text);
            let extraAIContext = '';

            if (autoresponderMatch) {
                console.log(`[MessageController] Autoresponder coincidencia: ${autoresponderMatch.keyword} -> Acción: ${autoresponderMatch.aiAction}`);
                
                if (autoresponderMatch.aiAction === 'no_response') {
                    // Ignorar silenciosamente
                    return;
                }
                
                // Procesar variables dinámicas como {NOMBRE}, {HORA_12}, etc.
                const processedResponse = processVariables(autoresponderMatch.response, senderName);

                if (autoresponderMatch.aiAction === 'menu_only') {
                    // Enviar solo la respuesta configurada y salir
                    await this.messageService.sendMessage(jid, processedResponse);
                    return;
                } else if (autoresponderMatch.aiAction === 'ai_context') {
                    // Añadir la respuesta al contexto para que la IA la tome en cuenta en su evaluación
                    extraAIContext = `\n\n[INSTRUCCIÓN CRÍTICA DE SISTEMA: El usuario ha introducido una palabra clave especial. ESTA ES LA INFORMACIÓN/MENÚ QUE DEBES OFRECERLE DE FORMA INMEDIATA Y NATURAL EN TU RESPUESTA: "${processedResponse}"]`;
                }
            }

            // 1. Obtener respuesta de la IA
            const finalTextToAI = text + extraAIContext;
            const response = await this.aiService.runAgent(jid, finalTextToAI, sender);
            
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
