import { GoogleSheetsService } from '../../autoresponders/sheets.service';
import * as dbManager from '../../../core/dbManager';

export class SheetsSyncJob {
    /**
     * Evalúa si es necesario disparar la sincronización de Google Sheets según la configuración del usuario.
     */
    static async execute(): Promise<void> {
        try {
            const settings = await (dbManager as any).getSheetSyncSettings();
            if (!settings || !settings.isActive || settings.syncInterval === 'manual') {
                return;
            }

            const now = new Date();
            const lastSync = settings.lastSyncTime ? new Date(settings.lastSyncTime) : new Date(0);
            const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;

            let shouldSync = false;
            if (settings.syncInterval === '15m' && diffMinutes >= 15) shouldSync = true;
            if (settings.syncInterval === '1h' && diffMinutes >= 60) shouldSync = true;
            if (settings.syncInterval === '12h' && diffMinutes >= 720) shouldSync = true;

            if (shouldSync) {
                console.log("[SheetsSyncJob] Ejecutando sincronización automática de Google Sheets...");
                const service = new GoogleSheetsService();
                const result = await service.syncNow();
                if (result.success) {
                    console.log(`[SheetsSyncJob] Sincronización Google Sheets exitosa. Importadas: ${result.count}`);
                } else {
                    console.error(`[SheetsSyncJob] Fallo en sincronización Google Sheets: ${result.message}`);
                }
            }
        } catch (error: any) {
            console.error("[SheetsSyncJob] Error en job de Google Sheets Sync:", error.message);
        }
    }
}
