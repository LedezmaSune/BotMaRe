import { DateTime } from "luxon";
import { createReminder, listReminders, deleteReminder } from "../core/db";

export const remindersTool = {
    definition: {
        name: "manage_reminders",
        description: "Permite crear, listar o borrar recordatorios y mensajes programados.",
        parameters: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["create", "list", "delete"] },
                text: { type: "string", description: "El mensaje a recordar o pie de foto" },
                time: { type: "string", description: "Fecha y hora (ISO o natural, ej: 'mañana a las 10am')" },
                targetChatId: { type: "string", description: "JID del grupo o chat de destino (opcional, por defecto es el actual)" },
                mediaPath: { type: "string", description: "Ruta local o URL de la imagen o archivo a enviar (opcional)" },
                mediaType: { type: "string", enum: ["image", "video", "audio", "document"], description: "Tipo de archivo (opcional)" },
                id: { type: "number", description: "ID del recordatorio para borrar" }
            },
            required: ["action"]
        }
    },
    handler: async (args: any, userId: string, chatId: string) => {
        const finalChatId = args.targetChatId || chatId;
        switch (args.action) {
            case "create":
                if (!args.text || !args.time) return "Faltan texto o hora para el recordatorio.";
                
                let timeStr = args.time;
                const now = DateTime.now().setZone('America/Mexico_City');
                
                if (timeStr.toLowerCase() === 'inmediato' || timeStr.toLowerCase() === 'ahora' || timeStr.toLowerCase() === 'inmediatamente') {
                    timeStr = now.toISO()?.substring(0, 16);
                } else if (timeStr.toLowerCase().includes('mañana')) {
                    const tomorrow = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
                    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
                    const timePart = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '08:00';
                    timeStr = `${tomorrow}T${timePart}`;
                } else if (timeStr.length === 5 && timeStr.includes(':')) {
                    timeStr = `${now.toFormat('yyyy-MM-dd')}T${timeStr}`;
                }

                const id = await createReminder(userId, finalChatId, args.text, timeStr, args.mediaPath, args.mediaType);
                return `✅ Recordatorio programado con ID: ${id} para ${timeStr} en el chat ${finalChatId}. ${args.mediaPath ? '(Incluye multimedia)' : ''}`;

            case "list":
                const list = await listReminders(userId);
                if (list.length === 0) return "No tienes recordatorios pendientes.";
                return list.map((r: any) => `[${r.id}] ${r.time}: ${r.text}`).join('\n');
            case "delete":
                if (!args.id) return "Falta el ID del recordatorio.";
                await deleteReminder(args.id);
                return `✅ Recordatorio ${args.id} borrado.`;
            default:
                return "Acción no reconocida.";
        }
    }
};
