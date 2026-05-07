import makeWASocket, { 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    ConnectionState,
    DisconnectReason
} from '@whiskeysockets/baileys';
import { useSQLiteAuthState } from './sqlite-auth';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'error' });

/**
 * INFRASTRUCTURE LAYER
 * Este cliente solo se encarga de la conexión pura con Baileys.
 * No sabe nada de lógica de negocio (IA, recordatorios, etc).
 */
export class WhatsAppClient {
    private socket: any;
    private state: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private qr: string | null = null;

    // Callbacks para desacoplar el cliente del resto de la app
    public onStatusUpdate?: (data: { state: string, qr?: string }) => void;
    public onMessage?: (data: any) => void;

    async connect() {
        try {
            const { state, saveCreds } = await useSQLiteAuthState(path.join('data', 'whatsapp_auth.db'));
            const { version } = await fetchLatestBaileysVersion();

            this.socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                logger,
                printQRInTerminal: false,
                browser: ['BotMaRe AI', 'Chrome', '1.0.0'],
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
        if (this.state !== 'connected' || !this.socket) {
            throw new Error('WhatsApp Client not connected');
        }
        return await this.socket.sendMessage(jid, content);
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
            this.state = 'disconnected';
        }
    }

    async getGroups() {
        if (!this.socket) return {};
        try {
            return await this.socket.groupFetchAllParticipating();
        } catch (e) {
            return {};
        }
    }

    getStatus() {
        return { state: this.state, qr: this.qr };
    }
}
