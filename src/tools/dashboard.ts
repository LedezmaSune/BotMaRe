import { MessageService } from "../modules/messages/message.service";
import { getSettings, getActiveEngine, listTemplates, listAutoresponders } from "../core/dbManager";
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
    }
};
