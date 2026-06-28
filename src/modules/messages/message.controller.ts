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
            const autoresponderMatch = await this.autoresponderService.match(text, jid);
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
                    // Verificar si viene una imagen incrustada (Ej. desde Google Sheets)
                    let imageUrl = null;
                    try {
                        if (autoresponderMatch.options) {
                            const parsed = JSON.parse(autoresponderMatch.options);
                            if (parsed.image) imageUrl = parsed.image;
                        }
                    } catch(e) {}

                    if (imageUrl) {
                        let mediaType: 'image' | 'document' | 'video' | 'audio' = 'image';
                        const lowerUrl = imageUrl.toLowerCase();
                        if (lowerUrl.includes('.pdf') || lowerUrl.includes('.doc') || lowerUrl.includes('.xls')) mediaType = 'document';
                        else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.avi')) mediaType = 'video';
                        else if (lowerUrl.includes('.mp3') || lowerUrl.includes('.ogg')) mediaType = 'audio';

                        await this.messageService.sendMediaFromUrl(jid, imageUrl, processedResponse, mediaType);
                    } else {
                        await this.messageService.sendMessage(jid, processedResponse);
                    }
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

            // 2. Enviar respuesta vía WhatsApp (Interceptar imágenes dinámicas y archivos)
            const mediaMatch = response.match(/\[(IMG|DOC|VIDEO|AUDIO|MEDIA):\s*(.+?)\]/i);
            if (mediaMatch) {
                const tagType = mediaMatch[1].toUpperCase();
                const content = mediaMatch[2].trim();
                const textWithoutMedia = response.replace(mediaMatch[0], '').trim();
                
                let mediaUrl = content;
                let mediaCategory: 'image' | 'document' | 'video' | 'audio' = 'document';

                if (tagType === 'IMG' || tagType === 'MEDIA') {
                    mediaCategory = 'image';
                    // Si el contenido no parece una URL, asumimos que es una búsqueda para Pollinations AI
                    if (!content.startsWith('http')) {
                        mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(content)}?nologo=true`;
                    }
                } else if (tagType === 'VIDEO') {
                    mediaCategory = 'video';
                } else if (tagType === 'AUDIO') {
                    mediaCategory = 'audio';
                }

                await this.messageService.sendMediaFromUrl(jid, mediaUrl, textWithoutMedia, mediaCategory);
            } else {
                await this.messageService.sendMessage(jid, response);
            }

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
