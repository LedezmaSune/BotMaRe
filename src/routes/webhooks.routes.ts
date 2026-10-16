import express, { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { NotificationHub } from '../core/notificationHub';
import { UpdateService } from '../modules/system/update.service';
import { MessageService } from '../modules/messages/message.service';

const updateService = new UpdateService();

// Caché en memoria para idempotencia de entregas de GitHub
const processedDeliveries = new Set<string>();
const MAX_DELIVERIES_CACHE = 1000;

/**
 * Middleware para validar el API Key del Webhook
 * Acepta la clave solo por cabecera x-api-key o Authorization: Bearer <key>
 * No acepta query string por seguridad. Compara en tiempo constante.
 */
export function requireWebhookAuth(req: Request, res: Response, next: NextFunction) {
    const validKey = process.env.WEBHOOK_API_KEY;
    if (!validKey || validKey.trim() === '') {
        console.warn(`[Webhooks] 🚫 Acceso denegado a IP ${req.ip} (WEBHOOK_API_KEY no configurada en el servidor).`);
        return res.status(503).json({ success: false, error: 'Servicio no disponible: WEBHOOK_API_KEY no configurada' });
    }

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    const providedKey = apiKeyHeader ? apiKeyHeader.trim() : bearerToken;

    if (!providedKey) {
        console.warn(`[Webhooks] 🚫 Acceso denegado a IP ${req.ip} (API Key faltante).`);
        return res.status(401).json({ success: false, error: 'No autorizado. Se requiere cabecera x-api-key o Bearer token' });
    }

    const bufProvided = Buffer.from(providedKey);
    const bufValid = Buffer.from(validKey.trim());

    if (bufProvided.length !== bufValid.length) {
        crypto.timingSafeEqual(bufProvided, bufProvided);
        console.warn(`[Webhooks] 🚫 Acceso denegado a IP ${req.ip} (API Key inválida).`);
        return res.status(401).json({ success: false, error: 'No autorizado. API Key inválida' });
    }

    if (!crypto.timingSafeEqual(bufProvided, bufValid)) {
        console.warn(`[Webhooks] 🚫 Acceso denegado a IP ${req.ip} (API Key inválida).`);
        return res.status(401).json({ success: false, error: 'No autorizado. API Key inválida' });
    }

    next();
}

/**
 * Valida la firma HMAC SHA256 de GitHub sobre el cuerpo crudo (req.rawBody)
 */
export function verifyGitHubSignature(req: Request): { valid: boolean; status?: number; error?: string } {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret || secret.trim() === '') {
        console.warn('[Webhook/GitHub] ⚠️ GITHUB_WEBHOOK_SECRET no configurada. Rechazando petición de webhook.');
        return { valid: false, status: 503, error: 'Servicio no disponible: GITHUB_WEBHOOK_SECRET no configurada' };
    }

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
        return { valid: false, status: 401, error: 'Firma de webhook faltante (x-hub-signature-256)' };
    }

    const rawBody = (req as any).rawBody;
    const payload: Buffer = Buffer.isBuffer(rawBody)
        ? rawBody
        : (typeof rawBody === 'string' ? Buffer.from(rawBody) : Buffer.from(JSON.stringify(req.body || '')));

    const hmac = crypto.createHmac('sha256', secret.trim());
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    const sigBuf = Buffer.from(signature);
    const digBuf = Buffer.from(digest);

    if (sigBuf.length !== digBuf.length) {
        crypto.timingSafeEqual(sigBuf, sigBuf);
        return { valid: false, status: 401, error: 'Firma de webhook inválida' };
    }

    try {
        const isValid = crypto.timingSafeEqual(sigBuf, digBuf);
        return isValid ? { valid: true } : { valid: false, status: 401, error: 'Firma de webhook inválida' };
    } catch {
        return { valid: false, status: 401, error: 'Firma de webhook inválida' };
    }
}

/**
 * Fábrica de rutas de webhooks
 */
export function createWebhooksRouter(waService: MessageService) {
    const router = Router();
    router.use(express.urlencoded({ extended: true }));

    /**
     * POST /api/webhooks/github
     * Recibe eventos de push y release desde GitHub para notificaciones en tiempo real y auto-despliegue
     */
    router.post('/github', async (req: Request, res: Response) => {
        const verification = verifyGitHubSignature(req);
        if (!verification.valid) {
            console.warn(`[Webhook/GitHub] 🚨 ${verification.error}`);
            return res.status(verification.status || 401).json({ success: false, error: verification.error });
        }

        // Idempotencia: evitar builds encadenados por entregas duplicadas
        const deliveryId = req.headers['x-github-delivery'] as string;
        if (deliveryId) {
            if (processedDeliveries.has(deliveryId)) {
                console.log(`[Webhook/GitHub] ℹ️ Entrega duplicada ignorada (delivery: ${deliveryId}).`);
                return res.json({ success: true, message: 'Evento duplicado ya procesado.' });
            }
            if (processedDeliveries.size >= MAX_DELIVERIES_CACHE) {
                const oldest = processedDeliveries.values().next().value;
                if (oldest) processedDeliveries.delete(oldest);
            }
            processedDeliveries.add(deliveryId);
        }

        const event = req.headers['x-github-event'] as string;

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

                // 2. Solo si AUTO_DEPLOY es estrictamente true, ejecutar actualización y build
                const isAutoDeploy = process.env.AUTO_DEPLOY === 'true';
                if (isAutoDeploy) {
                    console.log('[Webhook/GitHub] ⚙️ AUTO_DEPLOY activo. Iniciando compilación en segundo plano...');
                    
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
            const { phone, message, mediaUrl, mediaType } = req.body;
            if (!phone || (!message && !mediaUrl)) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Faltan parámetros obligatorios: se requiere 'phone' y al menos 'message' o 'mediaUrl'." 
                });
            }
            console.log(`[Webhooks] 🚀 Recibida solicitud Zapier/Make/GAS para ${phone}`);
            if (mediaUrl) {
                const type = mediaType || (mediaUrl.includes('download') || mediaUrl.includes('.pdf') ? 'document' : 'image');
                const captionText = message && typeof message === 'string' && message.trim().length > 0 ? message.trim() : undefined;
                await waService.sendMediaFromUrl(phone, mediaUrl, captionText, type as any);
            } else {
                await waService.sendMessage(phone, message);
            }
            return res.json({ success: true, message: 'Mensaje enviado exitosamente a WhatsApp.' });
        } catch (error: any) {
            console.error('[Webhooks] ❌ Error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/status', requireWebhookAuth, (req: Request, res: Response) => {
        res.status(200).json({ 
            status: 'active', 
            githubWebhookUrl: '/api/webhooks/github',
            incomingWebhookUrl: '/api/webhooks/incoming',
            autoDeploy: process.env.AUTO_DEPLOY === 'true',
            authMethod: 'Bearer Token or x-api-key'
        });
    });

    return router;
}

export default Router();
