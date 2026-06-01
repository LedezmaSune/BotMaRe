import makeWASocket, { 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    ConnectionState,
    DisconnectReason
} from '@whiskeysockets/baileys';
import { useSQLiteAuthState } from './sqlite-auth';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'silent' });

/**
 * INFRASTRUCTURE LAYER
 * Este cliente solo se encarga de la conexión pura con Baileys.
 * No sabe nada de lógica de negocio (IA, recordatorios, etc).
 */
export class WhatsAppClient {
    private socket: any;
    private state: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private qr: string | null = null;
    private groupCache: any = null;
    private groupCacheTime: number = 0;
    private groupFetchPromise: Promise<any> | null = null;
    private connectionPromise: Promise<void> | null = null;
    private resolveConnection: (() => void) | null = null;
    private authCloseFn: (() => void) | null = null;

    // Callbacks para desacoplar el cliente del resto de la app
    public onStatusUpdate?: (data: { state: string, qr?: string }) => void;
    public onMessage?: (data: any) => void;

    async connect() {
        if (this.state === 'connecting') return;
        
        // Crear una promesa que se resolverá cuando estemos conectados
        this.connectionPromise = new Promise((resolve) => {
            this.resolveConnection = resolve;
        });

        try {
            const { state, saveCreds, close: authClose } = await useSQLiteAuthState(path.join('data', 'whatsapp_auth.db'));
            this.authCloseFn = authClose;
            const { version } = await fetchLatestBaileysVersion();

            this.socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                logger,
                printQRInTerminal: false,
                browser: ['Ubuntu', 'Chrome', '20.0.04'], // Requerido para Pairing Code
                syncFullHistory: false, // No descargar todo el historial para evitar Timeouts
                shouldSyncHistoryMessage: () => false, // No sincronizar mensajes antiguos
                generateHighQualityLinkPreview: false, // Ahorrar recursos al no generar previsualizaciones pro
                markOnlineOnConnect: false, // Menos tráfico al arrancar
                connectTimeoutMs: 120000, // Darle 2 minutos para conectar
                defaultQueryTimeoutMs: 0, // 0 desactiva el timeout interno para consultas lentas iniciales
                keepAliveIntervalMs: 30000,
            });

            this.socket.ev.on('creds.update', saveCreds);

            this.socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    this.qr = qr;
                    this.onStatusUpdate?.({ state: 'connecting', qr });
                }

                if (connection === 'open') {
                    this.state = 'connected';
                    this.qr = null;
                    this.onStatusUpdate?.({ state: 'connected' });
                    // Resolver la promesa de conexión
                    this.resolveConnection?.();
                    
                    // Sincronizar grupos y guardar la promesa
                    console.log("[WhatsAppClient] Sincronizando lista de grupos...");
                    this.groupFetchPromise = this.getGroups().catch(() => null);

                    // Sincronizar automáticamente el nombre de perfil de WhatsApp con el bot_name configurado
                    // Agregamos un retraso de 3 segundos para asegurar que el estado de la sesión esté completamente cargado en Baileys
                    setTimeout(() => {
                        try {
                            const { getSettings } = require('../../core/memory');
                            getSettings().then((settings: any) => {
                                const botName = settings.bot_name || 'BotMaRe';
                                if (this.socket && typeof this.socket.updateProfileName === 'function') {
                                    console.log(`[WhatsAppClient] Sincronizando nombre de perfil en WhatsApp con settings: ${botName}`);
                                    this.socket.updateProfileName(botName).catch((e: any) => {
                                        console.warn('[WhatsAppClient] No se pudo actualizar el nombre del perfil en WhatsApp:', e.message);
                                    });
                                }
                            }).catch(() => null);
                        } catch (e: any) {
                            console.warn('[WhatsAppClient] Error al cargar getSettings para sincronizar perfil:', e.message);
                        }
                    }, 3000);
                } else if (connection === 'close') {
                    this.state = 'disconnected';
                    this.onStatusUpdate?.({ state: 'disconnected' });
                    
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    
                    if (shouldReconnect) {
                        const delay = 5000; // Esperar 5 segundos antes de reintentar
                        console.log(`[Infraestructura WA] Conexión perdida (Causa: ${statusCode}). Reintentando en ${delay/1000}s...`);
                        setTimeout(() => {
                            void this.connect();
                        }, delay);
                    } else {
                        console.log('[Infraestructura WA] Sesión cerrada permanentemente. Se requiere re-escaneo de QR.');
                    }
                }
            });

            // Emitimos los mensajes crudos para que el Router los procese
            this.socket.ev.on('messages.upsert', (data: any) => {
                this.onMessage?.(data);
            });

        } catch (error) {
            console.error('[Infraestructura WA] Error al conectar:', error);
            this.state = 'disconnected';
            this.onStatusUpdate?.({ state: 'disconnected' });
        }
    }

    async sendRaw(jid: string, content: any) {
        // Si no estamos conectados, esperamos un máximo de 10 segundos
        if (this.state !== 'connected') {
            console.log(`[WhatsAppClient] Esperando conexión para enviar a ${jid}...`);
            if (this.connectionPromise) {
                await Promise.race([
                    this.connectionPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout esperando conexión')), 10000))
                ]);
            }
        }

        if (this.state !== 'connected' || !this.socket) {
            throw new Error('WhatsApp Client not connected');
        }

        // Si es un grupo, intentamos asegurar que el bot lo "conoce"
        if (jid.endsWith('@g.us')) {
            // Esperar a que la sincronización inicial termine si está en curso
            if (this.groupFetchPromise) {
                console.log(`[WhatsAppClient] Esperando fin de sincronización de grupos para ${jid}...`);
                await this.groupFetchPromise.catch(() => null);
            }

            try {
                // Forzar la carga de metadatos del grupo
                await this.socket.groupMetadata(jid);
                // Truco: Simular que "vemos" el chat antes de escribir
                await this.socket.readMessages([{ remoteJid: jid, fromMe: false, id: '1' }]).catch(() => null);
                await new Promise(r => setTimeout(r, 1000));
            } catch (e: any) {
                // Hacemos que el fallo de obtención de metadatos sea no-bloqueante
                console.warn(`[WhatsAppClient] No se pudieron obtener metadatos para ${jid}: ${e.message}. Continuando intento de envío...`);
            }
        }

        try {
            return await this.socket.sendMessage(jid, content);
        } catch (error: any) {
            // Si falla con not-acceptable en un grupo, esperamos un poco y reintentamos una vez
            if (error.message?.includes('not-acceptable') && jid.endsWith('@g.us')) {
                console.log(`[WhatsAppClient] Reintentando envío a grupo ${jid} tras error not-acceptable...`);
                await new Promise(r => setTimeout(r, 3000));
                return await this.socket.sendMessage(jid, content);
            }
            throw error;
        }
    }

    async sendPresence(jid: string, state: 'composing' | 'recording' | 'paused') {
        if (this.state !== 'connected' || !this.socket) return;
        await this.socket.sendPresenceUpdate(state, jid);
    }

    getSocket() {
        return this.socket;
    }

    async disconnect() {
        if (this.socket) {
            try {
                await this.socket.logout();
            } catch (e) {}
            this.socket.end(undefined);
            this.socket = null;
        }

        if (this.authCloseFn) {
            console.log('[WhatsAppClient] Cerrando conexión de base de datos de sesión...');
            try {
                this.authCloseFn();
            } catch (e) {}
            this.authCloseFn = null;
        }

        this.state = 'disconnected';
    }

    async getGroups() {
        // Si no está conectado, devolvemos el caché sin intentar la consulta
        if (!this.socket || this.state !== 'connected') {
            return this.groupCache || {};
        }

        const now = Date.now();
        // Usar caché si tiene menos de 5 minutos (300,000 ms)
        if (this.groupCache && (now - this.groupCacheTime < 300000)) {
            return this.groupCache;
        }

        // Si ya hay una petición en curso, esperar a que termine
        if (this.groupFetchPromise) {
            return this.groupFetchPromise;
        }

        this.groupFetchPromise = (async () => {
            try {
                const groups = await this.socket.groupFetchAllParticipating();
                if (groups && Object.keys(groups).length > 0) {
                    this.groupCache = groups;
                    this.groupCacheTime = Date.now();
                }
                return groups || this.groupCache || {};
            } catch (e: any) {
                // Manejar errores conocidos silenciosamente para evitar spam en consola
                if (e.message?.includes('rate-overlimit') || e?.output?.payload?.message === 'rate-overlimit') {
                    console.warn('[Infraestructura WA] Límite de tasa excedido en grupos (rate-overlimit). Usando caché o devolviendo vacío.');
                } else if (!e.message?.includes('Connection Closed')) {
                    console.error('[Infraestructura WA] Error al obtener grupos:', e);
                }
                return this.groupCache || {};
            } finally {
                this.groupFetchPromise = null;
            }
        })();

        return this.groupFetchPromise;
    }

    getStatus() {
        return { state: this.state, qr: this.qr };
    }

    async requestPairingCode(phoneNumber: string): Promise<string> {
        if (!this.socket) {
            throw new Error('Socket no inicializado');
        }
        
        // Esperar a que el socket esté listo para pedir el código
        if (this.state === 'connecting') {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
            console.log(`[WhatsAppClient] Solicitando Pairing Code para: ${phoneNumber}`);
            const code = await this.socket.requestPairingCode(phoneNumber);
            return code;
        } catch (error) {
            console.error('[WhatsAppClient] Error al solicitar Pairing Code:', error);
            throw error;
        }
    }
}
