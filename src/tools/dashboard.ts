import { MessageService } from "../modules/messages/message.service";
import { getSettings, updateSettings, getActiveEngine, listTemplates, listAutoresponders } from "../core/dbManager";
import os from "os";

let waService: MessageService;

export function initDashboardTools(service: MessageService) {
    waService = service;
}

export const dashboardTools = {
    get_system_stats: {
        definition: {
            name: "get_system_stats",
            description: "Obtiene las estadísticas generales del sistema, estado de conexión de WhatsApp, memoria RAM y datos de la base de datos.",
            parameters: {
                type: "object",
                properties: {}
            }
        },
        handler: async () => {
            try {
                let waStatus = "Desconocido";
                if (waService) {
                    const statusObj = waService.getStatus();
                    waStatus = statusObj.state || "Desconocido";
                }

                const engine = await getActiveEngine();
                const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
                const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
                const uptime = (os.uptime() / 3600).toFixed(1);

                return `Estadísticas del Sistema:
- Estado WhatsApp: ${waStatus}
- Motor Activo: ${engine || 'N/A'}
- Memoria Libre: ${freeMem} GB / ${totalMem} GB
- Uptime OS: ${uptime} horas`;
            } catch (error: any) {
                return `Error al obtener estadísticas: ${error.message}`;
            }
        }
    },
    manage_wa_session: {
        definition: {
            name: "manage_wa_session",
            description: "Administra la sesión de WhatsApp (permite desconectar o consultar el estado de la conexión actual).",
            parameters: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        enum: ["status", "disconnect", "purge"],
                        description: "Acción a realizar sobre la sesión de WhatsApp."
                    }
                },
                required: ["action"]
            }
        },
        handler: async (args: { action: string }) => {
            if (!waService) return "Servicio de WhatsApp no inicializado.";
            try {
                switch (args.action) {
                    case "status":
                        const statusObj = waService.getStatus();
                        return `Estado de WhatsApp: ${JSON.stringify(statusObj)}`;
                    case "disconnect":
                        await waService.disconnect();
                        return "Se ha enviado el comando de desconexión. La sesión de WhatsApp se cerrará y PM2 reiniciará la conexión si está configurado.";
                    case "purge":
                        waService.purgePreKeys();
                        return "Se han purgado las llaves de encriptación (PreKeys) para resolver problemas de conexión.";
                    default:
                        return "Acción no válida.";
                }
            } catch (error: any) {
                return `Error al administrar WhatsApp: ${error.message}`;
            }
        }
    },
    restart_bot_service: {
        definition: {
            name: "restart_bot_service",
            description: "Reinicia el bot por completo. PM2 se encargará de volverlo a encender automáticamente.",
            parameters: {
                type: "object",
                properties: {}
            }
        },
        handler: async () => {
            setTimeout(() => {
                console.log("[Dashboard Tool] Reinicio solicitado por IA. Terminando proceso...");
                process.exit(1);
            }, 2000);
            return "Comando de reinicio recibido. El sistema se reiniciará en 2 segundos (PM2 lo levantará de nuevo).";
        }
    },
    update_bot_settings: {
        definition: {
            name: "update_bot_settings",
            description: "Actualiza la configuración del bot en la base de datos (nombre, rol y conocimiento).",
            parameters: {
                type: "object",
                properties: {
                    bot_name: { type: "string", description: "El nombre del bot." },
                    system_prompt: { type: "string", description: "El prompt del sistema (personalidad y rol principal)." },
                    possible_responses: { type: "string", description: "Conocimiento base, preguntas frecuentes o reglas de respuesta." }
                }
            }
        },
        handler: async (args: any) => {
            try {
                const toUpdate: Record<string, string> = {};
                if (args.bot_name) toUpdate.bot_name = args.bot_name;
                if (args.system_prompt) toUpdate.system_prompt = args.system_prompt;
                if (args.possible_responses) toUpdate.possible_responses = args.possible_responses;
                
                if (Object.keys(toUpdate).length === 0) return "No se enviaron campos válidos para actualizar.";
                
                await updateSettings(toUpdate);
                return "Configuración del bot actualizada correctamente en la base de datos.";
            } catch (error: any) {
                return `Error al actualizar la configuración: ${error.message}`;
            }
        }
    },
    manage_access_lists: {
        definition: {
            name: "manage_access_lists",
            description: "Administra las listas de acceso (whitelist/blacklist) de contactos y grupos de WhatsApp.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["add", "ban", "remove", "mode"], description: "Acción: add (Añadir a Whitelist), ban (Añadir a Blacklist), remove (Quitar de ambas), mode (Cambiar modo global)." },
                    target: { type: "string", description: "El número telefónico (ej. 521...), ID de grupo, o el modo deseado (all, whitelist, blacklist, none)." },
                    isGroup: { type: "boolean", description: "True si afecta a grupos, False si es para contactos individuales." }
                },
                required: ["action", "target", "isGroup"]
            }
        },
        handler: async (args: { action: string, target: string, isGroup: boolean }) => {
            try {
                const { accessControl } = require('../core/accessControl');
                return accessControl.processAdminCommand(`!lista ${args.action} ${args.target}`, args.isGroup);
            } catch (e: any) {
                return `Error al modificar listas: ${e.message}`;
            }
        }
    }
};
