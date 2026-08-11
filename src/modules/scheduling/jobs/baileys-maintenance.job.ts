import { MessageService } from '../../messages/message.service';

export class BaileysMaintenanceJob {
    /**
     * Purga las claves de sesión pre-compartidas (pre-keys) de Baileys para optimizar la base de datos local.
     */
    static async execute(waService: MessageService): Promise<void> {
        try {
            if (waService && typeof waService.purgePreKeys === 'function') {
                console.log("[BaileysMaintenanceJob] Ejecutando purga programada de pre-keys de Baileys...");
                waService.purgePreKeys();
            }
        } catch (error: any) {
            console.error("[BaileysMaintenanceJob] Error al purgar pre-keys de WhatsApp:", error.message);
        }
    }
}
