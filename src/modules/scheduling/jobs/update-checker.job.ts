import { UpdateService } from '../../system/update.service';
import { NotificationHub } from '../../../core/notificationHub';

export class UpdateCheckerJob {
    private static lastNotifiedCommit: string = '';
    private static isUpdating: boolean = false;
    private static updateService = new UpdateService();

    /**
     * Revisa periódicamente si existen nuevos commits o versiones en GitHub.
     * Si AUTO_DEPLOY está activo (por defecto true), ejecuta la actualización y compilación automáticamente.
     */
    static async execute(): Promise<void> {
        if (this.isUpdating) return;

        try {
            const status = await this.updateService.checkUpdate();
            if (!status.updateAvailable || !status.remoteCommit || status.remoteCommit === this.lastNotifiedCommit) {
                return;
            }

            this.lastNotifiedCommit = status.remoteCommit;
            const isAutoDeploy = process.env.AUTO_DEPLOY !== 'false'; // Default TRUE

            if (isAutoDeploy) {
                this.isUpdating = true;
                console.log(`[UpdateCheckerJob] 🚀 Nueva versión detectada [${status.remoteCommit}]. Iniciando auto-deploy por defecto...`);

                await NotificationHub.notify({
                    title: '🚀 Auto-Deploy Iniciado',
                    message: `Nueva versión detectada en GitHub [${status.remoteCommit}]. Descargando y compilando en segundo plano...`,
                    type: 'info',
                    source: 'system'
                });

                try {
                    const result = await this.updateService.performUpdate();
                    if (result.success) {
                        await NotificationHub.notify({
                            title: '✅ Auto-Deploy Completado',
                            message: 'Tu sistema se ha actualizado y compilado a la última versión de GitHub exitosamente.',
                            type: 'success',
                            source: 'system'
                        });
                    } else {
                        await NotificationHub.notify({
                            title: '⚠️ Advertencia en Auto-Deploy',
                            message: `No se pudo completar el auto-deploy: ${result.error}. Puedes intentar actualizar manualmente desde el Centro de Actualizaciones.`,
                            type: 'warning',
                            source: 'system',
                            link: '/updates'
                        });
                    }
                } catch (err: any) {
                    await NotificationHub.notify({
                        title: '❌ Error en Auto-Deploy',
                        message: err.message,
                        type: 'error',
                        source: 'system',
                        link: '/updates'
                    });
                } finally {
                    this.isUpdating = false;
                }
            } else {
                // Modo manual (AUTO_DEPLOY=false)
                await NotificationHub.notify({
                    title: '🔔 Actualización Disponible',
                    message: `Nueva versión disponible en GitHub (Commit ${status.remoteCommit}). Abre el Centro de Actualizaciones para instalarla.`,
                    type: 'info',
                    source: 'system',
                    link: '/updates'
                });
            }
        } catch (error: any) {
            // Silencioso para no ensuciar logs si no hay conexión a internet en el momento
        }
    }
}
