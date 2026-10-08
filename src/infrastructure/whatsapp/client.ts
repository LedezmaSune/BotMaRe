import makeWASocket, { 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    ConnectionState,
    DisconnectReason,
    proto
} from '@whiskeysockets/baileys';
import { useSQLiteAuthState } from './sqlite-auth';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'silent' });

/**
 * Almacén en memoria de mensajes recientes para responder a solicitudes de reintento de descifrado (Signal Protocol E2EE).
 * Evita que el cliente de WhatsApp del destinatario se quede indefinidamente con "Esperando el mensaje. Esto puede tomar tiempo".
 */
class MessageLRUCache {
    private cache = new Map<string, proto.IMessage>();
    private readonly maxSize: number;

    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
    }

    set(id: string, msg: proto.IMessage): void {
        if (!id || !msg) return;
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(id, msg);
    }

    get(id: string): proto.IMessage | undefined {
        return id ? this.cache.get(id) : undefined;
    }

    clear(): void {
        this.cache.clear();
    }
}

/**
 * INFRASTRUCTURE LAYER
 * Este cliente solo se encarga de la conexión pura con Baileys.
 * No sabe nada de lógica de negocio (IA, recordatorios, etc).
 */
export class WhatsAppClient {
    private socket: any = null;
    private state: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private qr: string | null = null;
    private groupCache: any = null;
    private groupCacheTime: number = 0;
    private groupFetchPromise: Promise<any> | null = null;

    // Control de sincronización de conexión
    private connectionPromise: Promise<void> | null = null;
    private resolveConnection: (() => void) | null = null;
    private rejectConnection: ((err: Error) => void) | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isConnecting = false;

    // Control de sesión SQLite
    private authCloseFn: (() => void) | null = null;
    private authClearFn: (() => void) | null = null;
    private purgePreKeysFn: (() => void) | null = null;

    // Almacén en memoria para reintentos criptográficos
    private messageCache = new MessageLRUCache(1000);

    // Callbacks para desacoplar el cliente del resto de la app
    public onStatusUpdate?: (data: { state: string, qr?: string }) => void;
    public onMessage?: (data: any) => void;

    async connect(): Promise<void> {
        // Evitar múltiples ejecuciones de connect() simultáneas
        if (this.isConnecting || this.state === 'connected') {
            return;
        }
        this.isConnecting = true;

        // Cancelar cualquier temporizador de reconexión pendiente
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Limpiar listeners y socket anterior para evitar sockets huérfanos en background
        if (this.socket) {
            try {
                this.socket.ev.removeAllListeners();
                this.socket.end(undefined);
            } catch (e) {}
            this.socket = null;
        }

        // Cerrar manejador SQLite anterior si quedó abierto para evitar bloqueos y fugas
        if (this.authCloseFn) {
            try { this.authCloseFn(); } catch (e) {}
            this.authCloseFn = null;
        }

        // Si había una promesa de conexión pendiente anterior, resolverla
        if (this.resolveConnection) {
            this.resolveConnection();
            this.resolveConnection = null;
            this.rejectConnection = null;
        }

        this.state = 'connecting';
        this.onStatusUpdate?.({ state: 'connecting', qr: this.qr || undefined });
        
        // Crear una promesa fresca que se resolverá cuando la conexión esté en estado 'open'
        this.connectionPromise = new Promise((resolve, reject) => {
            this.resolveConnection = resolve;
            this.rejectConnection = reject;
        });

        try {
            const { state, saveCreds, purgePreKeys, close: authClose, clear: authClear } = await useSQLiteAuthState(path.join('data', 'whatsapp_auth.db'));
            this.authCloseFn = authClose;
            this.authClearFn = authClear;
            this.purgePreKeysFn = purgePreKeys;
            const { version } = await fetchLatestBaileysVersion();

            this.socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                logger,
                printQRInTerminal: false,
                browser: ['BotMaRe', 'Chrome', '120.0.0'],
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                generateHighQualityLinkPreview: false,
                markOnlineOnConnect: true,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 0,
                keepAliveIntervalMs: 25000,
                retryRequestDelayMs: 500,
                maxMsgRetryCount: 5,
                // Función esencial para que WhatsApp pueda renegociar claves cuando el dispositivo del destinatario envía un msg-retry
                getMessage: async (key) => {
                    if (key?.id) {
                        const cached = this.messageCache.get(key.id);
                        if (cached) return cached;
                    }
                    return proto.Message.fromObject({});
                }
            });

            this.socket.ev.on('creds.update', saveCreds);

            this.socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    this.qr = qr;
                    this.state = 'connecting';
                    this.onStatusUpdate?.({ state: 'connecting', qr });
                }

                if (connection === 'open') {
                    this.state = 'connected';
                    this.qr = null;
                    this.isConnecting = false;
                    this.onStatusUpdate?.({ state: 'connected' });
                    
                    // Resolver la promesa de conexión activa
                    this.resolveConnection?.();
                    this.resolveConnection = null;
                    this.rejectConnection = null;
                    
                    // Sincronizar grupos de forma pasiva
                    this.groupFetchPromise = this.getGroups().catch(() => null);

                    // Sincronizar automáticamente el nombre de perfil de WhatsApp con el bot_name configurado
                    setTimeout(() => {
                        try {
                            const { getSettings } = require('../../core/memory');
                            getSettings().then((settings: any) => {
                                const botName = settings.bot_name || 'BotMaRe';
                                if (this.socket && typeof this.socket.updateProfileName === 'function') {
                                    this.socket.updateProfileName(botName).catch((e: any) => {
                                        console.warn('[WhatsAppClient] No se pudo actualizar el nombre del perfil en WhatsApp:', e.message);
                                    });
                                }
                            }).catch(() => null);
                        } catch (e: any) {
                            console.warn('[WhatsAppClient] Error al sincronizar nombre de perfil:', e.message);
                        }
                    }, 3000);
                } else if (connection === 'close') {
                    this.state = 'disconnected';
                    this.isConnecting = false;

                    // Invalidar la promesa de conexión previa para evitar lecturas obsoletas
                    if (this.rejectConnection) {
                        this.rejectConnection(new Error('Conexión cerrada por WhatsApp'));
                        this.rejectConnection = null;
                        this.resolveConnection = null;
                    }
                    this.connectionPromise = null;

                    this.onStatusUpdate?.({ state: 'disconnected' });
                    
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    
                    if (shouldReconnect) {
                        const isRestartRequired = statusCode === DisconnectReason.restartRequired;
                        const delay = isRestartRequired ? 1000 : 5000; 
                        
                        console.log(`[WhatsAppClient] Conexión cerrada (Código: ${statusCode || 'desconocido'}). Reintentando en ${delay/1000}s...`);
                        this.reconnectTimeout = setTimeout(() => {
                            void this.connect();
                        }, delay);
                    } else {
                        console.log('[WhatsAppClient] Sesión cerrada permanentemente (Logged Out). Limpiando credenciales para nuevo QR...');
                        this.qr = null;
                        this.authClearFn?.();
                        this.reconnectTimeout = setTimeout(() => {
                            void this.connect();
                        }, 1000);
                    }
                }
            });

            // Emitimos los mensajes y los guardamos en caché para resolver posibles reintentos de cifrado
            this.socket.ev.on('messages.upsert', (data: any) => {
                if (data?.messages) {
                    for (const msg of data.messages) {
                        if (msg?.key?.id && msg?.message) {
                            this.messageCache.set(msg.key.id, msg.message);
                        }
                    }
                }
                this.onMessage?.(data);
            });

        } catch (error) {
            console.error('[WhatsAppClient] Error al conectar:', error);
            this.state = 'disconnected';
            this.isConnecting = false;
            if (this.rejectConnection) {
                this.rejectConnection(error as Error);
                this.rejectConnection = null;
                this.resolveConnection = null;
            }
            this.connectionPromise = null;
            this.onStatusUpdate?.({ state: 'disconnected' });
        }
    }

    async sendRaw(jid: string, content: any): Promise<any> {
        // Si no estamos conectados, esperamos con un timeout controlado de 15 segundos
        if (this.state !== 'connected') {
            console.log(`[WhatsAppClient] Esperando conexión activa para enviar a ${jid}...`);
            if (this.connectionPromise) {
                try {
                    await Promise.race([
                        this.connectionPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout esperando conexión')), 15000))
                    ]);
                } catch (e) {
                    throw new Error(`WhatsApp Client no disponible (${(e as Error).message})`);
                }
            }
        }

        if (this.state !== 'connected' || !this.socket) {
            throw new Error('WhatsApp Client not connected');
        }

        // Si es un grupo y hay una sincronización en curso, esperar que concluya
        if (jid.endsWith('@g.us') && this.groupFetchPromise) {
            await this.groupFetchPromise.catch(() => null);
        }

        try {
            const sentResult = await this.socket.sendMessage(jid, content);
            if (sentResult?.key?.id && sentResult?.message) {
                this.messageCache.set(sentResult.key.id, sentResult.message);
            }
            return sentResult;
        } catch (error: any) {
            // Si falla con not-acceptable en un grupo, reintentamos de forma segura una vez
            if (error?.message?.includes('not-acceptable') && jid.endsWith('@g.us')) {
                console.warn(`[WhatsAppClient] Reintentando envío a grupo ${jid} tras error not-acceptable...`);
                await new Promise(r => setTimeout(r, 2500));
                const retryResult = await this.socket.sendMessage(jid, content);
                if (retryResult?.key?.id && retryResult?.message) {
                    this.messageCache.set(retryResult.key.id, retryResult.message);
                }
                return retryResult;
            }
            throw error;
        }
    }

    async sendPresence(jid: string, state: 'composing' | 'recording' | 'paused') {
        if (this.state !== 'connected' || !this.socket) return;
        try {
            await this.socket.presenceSubscribe(jid);
            await this.socket.sendPresenceUpdate(state, jid);
        } catch (e: any) {
            console.warn(`[WhatsAppClient] Error enviando presencia a ${jid}:`, e.message);
        }
    }

    getSocket() {
        return this.socket;
    }

    async disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            try {
                this.socket.ev.removeAllListeners();
                this.socket.end(undefined);
            } catch (e) {}
            this.socket = null;
        }

        if (this.authCloseFn) {
            console.log('[WhatsAppClient] Cerrando conexión de base de datos de sesión...');
            try {
                this.authCloseFn();
            } catch (e) {}
            this.authCloseFn = null;
        }

        this.messageCache.clear();
        this.connectionPromise = null;
        this.resolveConnection = null;
        this.rejectConnection = null;
        this.isConnecting = false;
        this.state = 'disconnected';
    }

    async resetSession() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            try {
                await this.socket.logout().catch(() => null);
            } catch (e) {}
            try {
                this.socket.ev.removeAllListeners();
                this.socket.end(undefined);
            } catch (e) {}
            this.socket = null;
        }

        if (this.authClearFn) {
            console.log('[WhatsAppClient] Limpiando credenciales de sesión en SQLite...');
            try {
                this.authClearFn();
            } catch (e) {}
        }

        if (this.authCloseFn) {
            console.log('[WhatsAppClient] Cerrando conexión de base de datos de sesión...');
            try {
                this.authCloseFn();
            } catch (e) {}
            this.authCloseFn = null;
        }

        this.messageCache.clear();
        this.connectionPromise = null;
        this.resolveConnection = null;
        this.rejectConnection = null;
        this.isConnecting = false;
        this.qr = null;
        this.state = 'disconnected';
        this.onStatusUpdate?.({ state: 'disconnected' });
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
                if (e.message?.includes('rate-overlimit') || e?.output?.payload?.message === 'rate-overlimit') {
                    console.warn('[WhatsAppClient] Límite de tasa excedido en grupos (rate-overlimit). Usando caché o devolviendo vacío.');
                } else if (!e.message?.includes('Connection Closed')) {
                    console.error('[WhatsAppClient] Error al obtener grupos:', e.message);
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
            throw new Error('El motor de WhatsApp aún se está inicializando. Por favor espera unos segundos.');
        }

        let clean = phoneNumber.replace(/\D/g, '');
        
        if (clean.length === 10) {
            clean = `521${clean}`;
        } else if (clean.length === 12 && clean.startsWith('52') && !clean.startsWith('521')) {
            clean = `521${clean.slice(2)}`;
        }

        if (clean.length < 10) {
            throw new Error('Número de teléfono incompleto o inválido.');
        }

        try {
            console.log(`[WhatsAppClient] Solicitando Pairing Code para: ${clean}`);
            const code = await this.socket.requestPairingCode(clean);
            return code;
        } catch (error: any) {
            console.error('[WhatsAppClient] Error al solicitar Pairing Code:', error);
            throw new Error(error?.message || 'No se pudo generar el código. Verifica que el número sea correcto o usa el código QR.');
        }
    }

    purgePreKeys() {
        if (this.purgePreKeysFn) {
            this.purgePreKeysFn();
        }
    }
}
