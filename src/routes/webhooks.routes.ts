import express, { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { NotificationHub } from '../core/notificationHub';
import { UpdateService } from '../modules/system/update.service';
import { MessageService } from '../modules/messages/message.service';

const updateService = new UpdateService();

/**
 * Middleware para validar el API Key del Webhook
 */
function requireWebhookAuth(req: Request, res: Response, next: NextFunction) {
    const validKey = process.env.WEBHOOK_API_KEY || 'botmare_default_secret_key';
    const providedKey = req.headers['x-api-key'] || 
                        (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null) || 
                        req.query.apikey;

    if (!providedKey || providedKey !== validKey) {
        console.warn(`[Webhooks] 🚫 Acceso denegado a IP ${req.ip} (API Key inválida o faltante).`);
        return res.status(401).json({ success: false, error: 'No autorizado. Verifica tu API Key' });
    }
    next();
}

/**
 * Fábrica de rutas de webhooks
 */
export function createWebhooksRouter(waService: MessageService) {
    const router = Router();
    router.use(express.urlencoded({ extended: true }));

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

    router.post('/incoming', requireWebhookAuth, async (req: Request, res: Response): Promise<any> => {
        try {
            const { phone, message, mediaUrl } = req.body;
            if (!phone || !message) {
                return res.status(400).json({ success: false, error: "Faltan parámetros obligatorios: 'phone' y 'message'." });
            }
            console.log(`[Webhooks] 🚀 Recibida solicitud Zapier/Make/GAS para ${phone}`);
            if (mediaUrl) {
                await waService.sendMediaFromUrl(phone, mediaUrl, message, 'image');
            } else {
                await waService.sendMessage(phone, message);
            }
            return res.json({ success: true, message: 'Mensaje enviado exitosamente a WhatsApp.' });
        } catch (error: any) {
            console.error('[Webhooks] ❌ Error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/status', (req: Request, res: Response) => {
        res.status(200).json({ 
            status: 'active', 
            githubWebhookUrl: '/api/webhooks/github',
            incomingWebhookUrl: '/api/webhooks/incoming',
            autoDeploy: process.env.AUTO_DEPLOY !== 'false',
            authMethod: "Bearer Token, x-api-key, or ?apikey"
        });
    });

    return router;
}

export default Router();
