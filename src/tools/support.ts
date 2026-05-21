import { pauseChat } from '../core/memory';
import { NotificationService } from '../telegram/notification.service';
import { globalEvents, EVENTS } from '../core/events';

export const supportTool = {
    definition: {
        name: "escalate_to_human",
        description: "Debe usarse cuando el usuario está frustrado, molesto, o pide explícitamente hablar con un humano, persona o asesor de soporte técnico. Esta herramienta suspenderá temporalmente tus respuestas automáticas para este usuario y alertará a un administrador para que lo atienda manualmente.",
        parameters: {
            type: "object",
            properties: {
                reason: {
                    type: "string",
                    description: "La razón breve por la que el usuario pide soporte (ej. 'Problema de pago', 'Frustración', 'Duda técnica compleja')."
                }
            },
            required: ["reason"]
        }
    },
    handler: async (args: { reason: string }, userId: string, chatId: string) => {
        try {
            console.log(`[Tool: Support] Escaling chat ${chatId} to human. Reason: ${args.reason}`);
            
            // Pausar el chat por 6 horas
            await pauseChat(chatId, args.reason, 6);
            
            // Emitir evento global (para que Socket.io en el bot lo intercepte y lo mande al Dashboard)
            globalEvents.emit('support_alert', { chatId, reason: args.reason, timestamp: new Date() });

            // Enviar notificación interactiva a Telegram
            const text = `⚠️ *[SOPORTE REQUERIDO]*\n\nEl cliente \`${chatId.replace('@s.whatsapp.net', '')}\` ha solicitado atención humana.\n\n*Razón:* ${args.reason}\n\n_La IA se ha suspendido temporalmente para este chat._`;
            
            // Creamos un teclado inline personalizado (requiere importar Markup o pasarlo de otra forma)
            // Ya que NotificationService envia un mensaje simple, vamos a construir la estructura raw para grammy
            const inline_keyboard = [[
                { text: "✅ Reactivar IA", callback_data: `reactivate_ia_${chatId}` }
            ]];
            
            await NotificationService.notifyAdmin(text, { reply_markup: { inline_keyboard } });

            return `Se ha notificado exitosamente a un asesor de soporte humano. Un representante te contactará en breve desde este mismo chat.`;
        } catch (error: any) {
            console.error(`[Tool: Support] Error:`, error.message);
            return `No se pudo conectar con el sistema de soporte: ${error.message}.`;
        }
    }
};
