import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { NotificationHub } from '../core/notificationHub';
import { UpdateService } from '../modules/system/update.service';

const router = Router();
const updateService = new UpdateService();

/**
 * Valida la firma HMAC SHA256 de GitHub si está configurado GITHUB_WEBHOOK_SECRET
 */
function verifyGitHubSignature(req: Request): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return true; // Si no se definió secreto, permitir (se puede proteger con IP o secret opcional)

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) return false;

    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
        return false;
    }
}

/**
 * POST /api/webhooks/github
 * Recibe eventos de push y release desde GitHub para notificaciones en tiempo real y auto-despliegue
 */
router.post('/github', async (req: Request, res: Response) => {
    const event = req.headers['x-github-event'] as string;

    if (!verifyGitHubSignature(req)) {
        console.warn('[Webhook/GitHub] 🚨 Firma de webhook inválida.');
        return res.status(401).json({ success: false, error: 'Firma de webhook inválida' });
    }

    if (event === 'ping') {
        console.log('[Webhook/GitHub] ✅ Ping recibido de GitHub. Webhook verificado.');
        await NotificationHub.notify({
            title: '🔗 GitHub Webhook Conectado',
            message: 'El webhook de GitHub se ha vinculado correctamente con tu VPS.',
            type: 'success',
            source: 'github'
        });
        return res.json({ success: true, message: 'Pong! Webhook vinculado correctamente.' });
    }

    if (event === 'push') {
        const ref = req.body.ref || '';
        const branch = ref.replace('refs/heads/', '');
        const targetBranch = process.env.GIT_BRANCH || 'main';

        // Solo procesar cambios en la rama principal
        if (branch === targetBranch || branch === 'main' || branch === 'master') {
            const commit = req.body.head_commit || (req.body.commits && req.body.commits[0]);
            const commitMsg = commit?.message ? commit.message.split('\n')[0] : 'Nuevas mejoras';
            const author = commit?.author?.name || 'GitHub';
            const shortSha = commit?.id ? commit.id.substring(0, 7) : 'update';

            console.log(`[Webhook/GitHub] 🚀 Push detectado en ${branch} [${shortSha}]: "${commitMsg}" por ${author}`);

            // 1. Notificar a todos los canales (Dashboard, Telegram, WhatsApp)
            await NotificationHub.notify({
                title: '🚀 Nueva Versión en GitHub',
                message: `[${shortSha}] ${commitMsg} (por ${author}). Ve al Centro de Actualizaciones para instalar o compilar.`,
                type: 'info',
                source: 'github',
                link: '/updates'
            });

            // 2. Si está configurado AUTO_DEPLOY (por defecto true), ejecutar actualización y build automáticamente
            const isAutoDeploy = process.env.AUTO_DEPLOY !== 'false';
            if (isAutoDeploy) {
                console.log('[Webhook/GitHub] ⚙️ AUTO_DEPLOY activo (por defecto). Iniciando compilación en segundo plano...');
                
                void (async () => {
                    await NotificationHub.notify({
                        title: '⚙️ Auto-Deploy en Progreso',
                        message: 'Descargando cambios y ejecutando build en el VPS...',
                        type: 'info',
                        source: 'github'
                    });

                    try {
                        const result = await updateService.performUpdate();
                        if (result.success) {
                            await NotificationHub.notify({
                                title: '✅ Auto-Deploy Completado',
                                message: 'La aplicación ha sido actualizada y recompilada exitosamente.',
                                type: 'success',
                                source: 'github'
                            });
                        } else {
                            await NotificationHub.notify({
                                title: '❌ Error en Auto-Deploy',
                                message: `Fallo durante la actualización: ${result.error}`,
                                type: 'error',
                                source: 'github'
                            });
                        }
                    } catch (err: any) {
                        await NotificationHub.notify({
                            title: '❌ Error Crítico en Auto-Deploy',
                            message: err.message,
                            type: 'error',
                            source: 'github'
                        });
                    }
                })();
            }

            return res.json({ 
                success: true, 
                message: 'Push procesado correctamente.',
                autoDeploy: isAutoDeploy
            });
        }

        return res.json({ success: true, message: `Push en rama ${branch} ignorado.` });
    }

    res.json({ success: true, message: `Evento ${event} recibido.` });
});

router.post('/incoming', (req, res) => {
    console.log('[Webhooks] Solicitud genérica entrante recibida.');
    res.status(200).json({ status: 'success', message: 'Webhook recibido correctamente.' });
});

router.get('/status', (req, res) => {
    res.status(200).json({ 
        status: 'active', 
        githubWebhookUrl: '/api/webhooks/github',
        autoDeploy: process.env.AUTO_DEPLOY !== 'false'
    });
});

export default router;
