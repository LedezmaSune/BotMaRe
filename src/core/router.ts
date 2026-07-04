import { WAMessage } from '@whiskeysockets/baileys';
import { MessageController } from '../modules/messages/message.controller';
import { NotificationService } from '../telegram/notification.service';
import { getSettings, isChatPaused } from './memory';
import { getConfig } from './config';
import { accessControl } from './accessControl';

const pausedUsers = new Map<string, number>();

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
        if (data.type !== 'notify') return; // Solo procesar mensajes nuevos en tiempo real
        
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

        // Comandos Administrativos (!lista)
        const ownerNumberConfig = await getConfig('WHATSAPP_OWNER_NUMBER', '');
        const ownerNumbers = ownerNumberConfig.split(',').map((n: string) => n.trim());
        const participantClean = participant.split('@')[0];
        const isGroup = jid.endsWith('@g.us');

        if (ownerNumbers.includes(participantClean)) {
            // 1. Ver si estamos en medio de un menú interactivo
            const menuResponse = accessControl.handleMenuWizard(participantClean, text, isGroup);
            if (menuResponse) {
                await socket.sendMessage(jid, { text: menuResponse }, { quoted: msg });
                return;
            }

            // 2. Si no, ver si iniciaron un comando administrativo
            if (text.trim() === '!lista') {
                const response = accessControl.startMenu(participantClean, isGroup);
                await socket.sendMessage(jid, { text: response }, { quoted: msg });
                return;
            } else if (text.startsWith('!lista ')) {
                const response = accessControl.processAdminCommand(text, isGroup);
                await socket.sendMessage(jid, { text: response }, { quoted: msg });
                return;
            }
        }

        // Rastrear interacciones para el Dashboard Web
        accessControl.trackInteraction(participantClean, pushName, false);
        if (isGroup) {
            accessControl.trackInteraction(jid, 'Grupo', true); // No tenemos el nombre del grupo aquí fácilmente, así que usamos un genérico
        }

        // Validación de Listas de Acceso (Whitelist/Blacklist)
        if (!accessControl.canReplyTo(participantClean, false)) {
            console.log(`[Router] Ignorando mensaje de ${participantClean} por reglas de lista (Contactos).`);
            return;
        }
        if (jid.endsWith('@g.us') && !accessControl.canReplyTo(jid, true)) {
            console.log(`[Router] Ignorando mensaje en grupo ${jid} por reglas de lista (Grupos).`);
            return;
        }

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

        // ==========================================
        // 1. HANDOFF (PAUSA DE IA Y ATENCIÓN HUMANA)
        // ==========================================
        
        // Verificar si el usuario está en pausa temporal
        if (pausedUsers.has(participantClean)) {
            const expireTime = pausedUsers.get(participantClean)!;
            if (Date.now() < expireTime) {
                console.log(`[Router] Ignorando mensaje de ${participantClean} (Pausa de IA activa).`);
                return; // Ignorar completamente, dejar que el humano responda
            } else {
                pausedUsers.delete(participantClean); // Ya expiró la pausa
            }
        }

        // Detectar si el usuario pide ayuda humana
        const lowerText = text.toLowerCase();
        const handoffKeywords = ['asesor', 'humano', 'soporte', 'hablar con un agente'];
        if (handoffKeywords.some(kw => lowerText.includes(kw))) {
            const pauseDurationHours = 1;
            pausedUsers.set(participantClean, Date.now() + (pauseDurationHours * 60 * 60 * 1000));
            
            console.log(`[Router] ⚠️ Handoff detectado para ${participantClean}. Pausando IA por ${pauseDurationHours} hora.`);
            
            // Avisar al cliente
            await socket.sendMessage(jid, { 
                text: "🤖 _Entendido. He pausado mi sistema automático. Un asesor humano se conectará contigo en breve..._" 
            }, { quoted: msg });
            
            // Avisar al Admin por Telegram
            const waLink = `https://wa.me/${participantClean}`;
            const alertMsg = `⚠️ *Solicitud de Asesor Humano*\n\n` +
                             `El usuario \`${participantClean}\` (\`${pushName}\`) ha solicitado ayuda humana.\n\n` +
                             `🤖 _La IA ha sido pausada para este usuario durante 1 hora._\n\n` +
                             `👇 *Hablar con el cliente:* \n${waLink}`;
            
            await NotificationService.notifyAdmin(alertMsg);
            
            return; // Terminar procesamiento aquí
        }
        // ==========================================

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
