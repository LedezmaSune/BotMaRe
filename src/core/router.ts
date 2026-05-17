import { WAMessage } from '@whiskeysockets/baileys';
import { MessageController } from '../modules/messages/message.controller';
import { getSettings } from './memory';
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
        const messageContent = msg.message;

        // Verificar si el Bot de IA está desactivado globalmente (Modo Humano)
        const aiEnabled = await getConfig('AI_ENABLED', 'true');
        if (aiEnabled === 'false') {
            console.log('[Router] Mensaje recibido pero ignorado porque el Bot de IA está desactivado (AI_ENABLED = false).');
            return;
        }

        // Extraer texto
        const text = messageContent.conversation
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
        }

        // Delegar al controlador
        await this.messageController.handleIncoming(jid, text, participant);
    }

    /**
     * Lógica extraída para verificar si el bot fue mencionado en un grupo
     */
    private async checkBotMention(text: string, messageContent: any, socket: any): Promise<boolean> {
        const settings = await getSettings() as any;
        const botName = settings.bot_name || 'BotMaRe';
        const botJid = socket.user?.id?.split(':')[0]; // ID sin el sufijo de sesión
        
        const mentions = messageContent.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const repliedJid = messageContent.extendedTextMessage?.contextInfo?.participant;

        return text.toLowerCase().includes(botName.toLowerCase()) ||
               mentions.some((m: string) => m.includes(botJid)) ||
               (repliedJid && repliedJid.includes(botJid));
    }
}
