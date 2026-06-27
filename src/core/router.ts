import { WAMessage } from '@whiskeysockets/baileys';
import { MessageController } from '../modules/messages/message.controller';
import { getSettings, isChatPaused } from './memory';
import { getConfig } from './config';

/**
 * CORE LAYER - ROUTER
 * Este es el punto de decisión. Recibe eventos crudos de los clientes (WhatsApp, etc)
 * y los traduce a llamadas limpias hacia los controladores.
 */
export class Router {
    constructor(private messageController: MessageController) {}

    /**
     * Maneja mensajes entrantes de WhatsApp
     */
    async handleWhatsAppMessage(data: { messages: WAMessage[], type: string }, socket: any) {
        const msg = data.messages[0];
        if (!msg || msg.key.fromMe || !msg.message) return;

        const jid = msg.key.remoteJid!;
        const participant = msg.key.participant || jid;
        const pushName = msg.pushName || '';
        const messageContent = msg.message;

        // Verificar si el Bot de IA está desactivado globalmente (Modo Humano)
        const aiEnabled = await getConfig('AI_ENABLED', 'true');
        if (aiEnabled === 'false') {
            console.log('[Router] Mensaje recibido pero ignorado porque el Bot de IA está desactivado (AI_ENABLED = false).');
            return;
        }

        // Verificar si el chat específico tiene la IA pausada (Soporte Técnico Humano)
        const isPaused = await isChatPaused(jid);
        if (isPaused) {
            console.log(`[Router] Mensaje de ${jid} ignorado por la IA porque está en modo soporte humano (pausado).`);
            return;
        }


        // Extraer texto
        let text = messageContent.conversation
            || messageContent.extendedTextMessage?.text
            || messageContent.listResponseMessage?.singleSelectReply?.selectedRowId
            || messageContent.buttonsResponseMessage?.selectedButtonId
            || '';

        if (!text) return;

        // Lógica de filtrado en grupos
        if (jid.endsWith('@g.us')) {
            const enableGroups = await getConfig('ENABLE_GROUPS', 'false');
            if (enableGroups !== 'true') {
                return; // Grupos deshabilitados globalmente
            }

            // Verificar si el grupo específico está permitido
            const allowedGroupsRaw = await getConfig('ALLOWED_GROUPS', '');
            if (allowedGroupsRaw) {
                const allowedGroups = allowedGroupsRaw.split(',').map(id => id.trim());
                if (!allowedGroups.includes(jid)) {
                    console.log(`[Router] Grupo ${jid} no está en la lista blanca.`);
                    return;
                }
            }

            const isMentioned = await this.checkBotMention(text, messageContent, socket);
            if (!isMentioned) return;

            // Limpiar la etiqueta del bot para que el texto puro llegue a la IA y a los Autorespondedores
            const genericTriggers = ['@bot', '@ia', '@ai', 'botmare', '@botmare'];
            let cleanText = text;
            for (const trigger of genericTriggers) {
                cleanText = cleanText.replace(new RegExp(trigger, 'gi'), '');
            }
            // Limpiar menciones nativas (@numero)
            const mentions = messageContent.extendedTextMessage?.contextInfo?.mentionedJid || [];
            mentions.forEach((m: string) => {
                const num = m.split('@')[0];
                cleanText = cleanText.replace(new RegExp(`@${num}`, 'gi'), '');
            });
            
            text = cleanText.trim() || text;
        }

        // Reaccionar de forma aleatoria para confirmar que el bot está procesando la solicitud
        try {
            const reactions = ['👍', '🤖', '👀', '💡', '✨', '⚙️', '🔍', '🚀', '✅', '⚡'];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            await socket.sendMessage(jid, { react: { text: randomReaction, key: msg.key } });
        } catch (err) {
            console.error('[Router] No se pudo enviar la reacción:', err);
        }

        // Delegar al controlador
        await this.messageController.handleIncoming(jid, text, participant, pushName);
    }

    /**
     * Lógica extraída para verificar si el bot fue mencionado en un grupo
     */
    private async checkBotMention(text: string, messageContent: any, socket: any): Promise<boolean> {
        const settings = await getSettings() as any;
        const botName = settings.bot_name || 'BotMaRe';
        
        // Extraemos los identificadores puros sin dominios (@s.whatsapp.net o @lid)
        const botJid = socket.user?.id?.split(':')[0]?.split('@')[0];
        const botLid = socket.user?.lid?.split('@')[0];
        const whatsAppName = socket.user?.name;
        
        const mentions = messageContent.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const repliedJid = messageContent.extendedTextMessage?.contextInfo?.participant;

        const cleanText = text.toLowerCase().trim();

        // 1. Menciones genéricas amigables
        const genericTriggers = ['@bot', '@ia', '@ai', 'botmare', '@botmare'];
        const isGenericTrigger = genericTriggers.some(trigger => cleanText.includes(trigger));

        // 2. Menciones por nombre configurado o nombre de perfil de WhatsApp
        const cleanBotName = botName.toLowerCase().trim();
        const cleanBotNameNoSpaces = cleanBotName.replace(/\s+/g, '');
        const isMentionedByName = 
            cleanText.includes(cleanBotName) || 
            cleanText.includes(cleanBotNameNoSpaces) ||
            cleanText.includes(`@${cleanBotName}`) ||
            cleanText.includes(`@${cleanBotNameNoSpaces}`);

        // Mención por nombre del perfil de WhatsApp (si está disponible)
        let isMentionedByProfileName = false;
        if (whatsAppName) {
            const cleanProfile = whatsAppName.toLowerCase().trim();
            const cleanProfileNoSpaces = cleanProfile.replace(/\s+/g, '');
            isMentionedByProfileName = 
                cleanText.includes(cleanProfile) || 
                cleanText.includes(cleanProfileNoSpaces) ||
                cleanText.includes(`@${cleanProfile}`) ||
                cleanText.includes(`@${cleanProfileNoSpaces}`);
        }

        // 3. Mención directa con número/LID escrito manualmente como texto (ej. @5491123456789)
        const hasTextNumberMention = 
            (botJid && (cleanText.includes(`@${botJid}`) || cleanText.includes(botJid))) ||
            (botLid && (cleanText.includes(`@${botLid}`) || cleanText.includes(botLid)));

        // 4. Mención nativa de WhatsApp (compara número tradicional o LID)
        const isMentionedByJid = mentions.some((m: string) => {
            const cleanM = m.split('@')[0];
            return (botJid && cleanM === botJid) || (botLid && cleanM === botLid);
        });

        // 5. Respuesta (Reply) al bot (compara número tradicional o LID)
        const isRepliedToBot = repliedJid && (
            repliedJid.includes(botJid) || (botLid && repliedJid.includes(botLid))
        );

        return isGenericTrigger || 
               isMentionedByName || 
               isMentionedByProfileName || 
               hasTextNumberMention || 
               isMentionedByJid || 
               isRepliedToBot;
    }
}
