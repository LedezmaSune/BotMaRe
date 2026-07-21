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

    /**
     * Procesa etiquetas de medios [IMG:], [DOC:], [VIDEO:], [AUDIO:] en cualquier texto.
     * Si encuentra una etiqueta, envía el archivo y devuelve true.
     * Si no encuentra ninguna, devuelve false (para que el caller envíe texto normal).
     */
    private async processMediaTags(jid: string, text: string): Promise<boolean> {
        const regex = /\[(IMG|DOC|VIDEO|AUDIO|MEDIA):\s*(.+?)\]/ig;
        const matches = [...text.matchAll(regex)];
        
        if (matches.length === 0) return false;

        // Limpiar todas las etiquetas del texto para el caption
        let textWithoutMedia = text;
        for (const match of matches) {
            textWithoutMedia = textWithoutMedia.replace(match[0], '');
        }
        textWithoutMedia = textWithoutMedia.trim();

        // Enviar todos los archivos
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const tagType = match[1].toUpperCase();
            const content = match[2].trim();

            let mediaUrl = content;
            let mediaCategory: 'image' | 'document' | 'video' | 'audio' = 'document';

            if (tagType === 'IMG' || tagType === 'MEDIA') {
                mediaCategory = 'image';
                if (!content.startsWith('http')) {
                    mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(content)}?nologo=true`;
                }
            } else if (tagType === 'VIDEO') {
                mediaCategory = 'video';
            } else if (tagType === 'AUDIO') {
                mediaCategory = 'audio';
            }

            // Solo añadir el caption al PRIMER archivo
            const caption = i === 0 && textWithoutMedia ? textWithoutMedia : undefined;
            
            await this.messageService.sendMediaFromUrl(jid, mediaUrl, caption, mediaCategory);
            
            // Pausa de 1 segundo entre archivos para no saturar WhatsApp y mantener orden
            if (i < matches.length - 1) {
                await new Promise(res => setTimeout(res, 1000));
            }
        }

        return true;
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
                    // Primero: verificar si la respuesta tiene etiquetas [DOC:], [IMG:], etc. en el texto
                    const sentMedia = await this.processMediaTags(jid, processedResponse);
                    if (sentMedia) return;

                    // Segundo: verificar si viene un archivo desde Google Sheets (Columna D / options)
                    let fileUrl = null;
                    try {
                        if (autoresponderMatch.options) {
                            const parsed = JSON.parse(autoresponderMatch.options);
                            if (parsed.image) fileUrl = parsed.image;
                        }
                    } catch(e) {}

                    if (fileUrl) {
                        let mediaType: 'image' | 'document' | 'video' | 'audio' = 'image';
                        let finalUrl = fileUrl;

                        // Verificar si viene con formato [TAG: URL] en la columna de Sheets
                        const bracketMatch = fileUrl.match(/\[(IMG|DOC|VIDEO|AUDIO|MEDIA):\s*(.+?)\]/i);
                        if (bracketMatch) {
                            const tagType = bracketMatch[1].toUpperCase();
                            finalUrl = bracketMatch[2].trim();
                            if (tagType === 'IMG' || tagType === 'MEDIA') mediaType = 'image';
                            else if (tagType === 'DOC') mediaType = 'document';
                            else if (tagType === 'VIDEO') mediaType = 'video';
                            else if (tagType === 'AUDIO') mediaType = 'audio';
                        } else {
                            // Detección tradicional si es URL directa
                            const lowerUrl = fileUrl.toLowerCase();
                            if (lowerUrl.includes('.pdf') || lowerUrl.includes('.doc') || lowerUrl.includes('.xls') || lowerUrl.includes('drive.google.com')) {
                                mediaType = 'document';
                            } else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.avi')) {
                                mediaType = 'video';
                            } else if (lowerUrl.includes('.mp3') || lowerUrl.includes('.ogg')) {
                                mediaType = 'audio';
                            }
                        }

                        await this.messageService.sendMediaFromUrl(jid, finalUrl, processedResponse, mediaType);
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

            // 2. Enviar respuesta vía WhatsApp (Interceptar etiquetas de medios)
            const sentMedia = await this.processMediaTags(jid, response);
            if (!sentMedia) {
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
