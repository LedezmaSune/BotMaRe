import { WhatsAppClient } from '../infrastructure/whatsapp/client';
import { MessageService } from '../modules/messages/message.service';
import { AIService } from '../modules/ai/ai.service';
import { MessageController } from '../modules/messages/message.controller';
import { Router } from './router';
import { Server } from 'socket.io';
import { globalEvents, EVENTS } from './events';

/**
 * CORE LAYER - BOT ENTITY
 * Esta clase es el ensamblador. Conecta la infraestructura con los módulos
 * y la lógica central. Es el único lugar donde se instancian y vinculan las piezas.
 */
export class Bot {
    private client: WhatsAppClient;
    private messageService: MessageService;
    private aiService: AIService;
    private messageController: MessageController;
    private router: Router;
    private diffusionService: any = null;

    constructor(private io: Server) {
        // 1. Infraestructura
        this.client = new WhatsAppClient();

        // 2. Servicios de Módulos
        this.messageService = new MessageService(this.client);
        this.aiService = new AIService();

        // 3. Controladores
        this.messageController = new MessageController(this.messageService, this.aiService);

        // 4. Router de Decisión
        this.router = new Router(this.messageController);

        // 5. Vinculación de Eventos
        this.setupEvents();
    }

    /**
     * Conecta los eventos del cliente de WhatsApp con el Router y Socket.io
     */
    private setupEvents() {
        // Actualizaciones de estado hacia el Frontend
        this.client.onStatusUpdate = (data) => {
            this.io.emit('status', data.state);
            if (data.qr) {
                this.io.emit('qr', data.qr);
            }
        };

        // Al conectar un nuevo cliente, mandarle el estado actual de difusión si existe
        this.io.on('connection', (socket) => {
            if (this.diffusionService) {
                const progress = this.diffusionService.getCurrentProgress();
                if (progress) {
                    socket.emit('diffusion_progress', progress);
                }
            }
        });

        // Mensajes entrantes hacia el Router
        this.client.onMessage = (data) => {
            this.router.handleWhatsAppMessage(data, this.client.getSocket());
        };
        
        // --- EVENTOS DE DIFUSIÓN MASIVA (Hacia el Frontend) ---
        globalEvents.on(EVENTS.DIFFUSION_PROGRESS, (data) => {
            this.io.emit('diffusion_progress', data);
        });

        globalEvents.on(EVENTS.DIFFUSION_COMPLETED, (data) => {
            this.io.emit('diffusion_completed', data);
        });

        globalEvents.on(EVENTS.DIFFUSION_LOG, (data) => {
            this.io.emit('diffusion_log', data);
        });
    }

    /**
     * Inicia el bot
     */
    async start() {
        console.log('[Bot] Motor modular inicializado. Conectando a WhatsApp...');
        void this.client.connect();
    }

    /**
     * Getters para compatibilidad con servicios existentes
     */
    getStatus() {
        return this.client.getStatus();
    }

    getMessageService() {
        return this.messageService;
    }

    /**
     * Adaptador para que el código antiguo (Routes, etc) siga funcionando
     * devolviendo un objeto que simula la interfaz del WhatsAppClient antiguo.
     */
    getSocketAdapter(): any {
        return {
            getSocket: () => this.client.getSocket(),
            getStatus: () => this.client.getStatus(),
            sendMessage: (jid: string, text: string) => this.messageService.sendMessage(jid, text),
            sendMedia: (jid: string, path: string, cap?: string) => this.messageService.sendMedia(jid, path, cap),
            sendRaw: (jid: string, content: any) => this.client.sendRaw(jid, content),
            sendPresence: (jid: string, state: any) => this.client.sendPresence(jid, state),
            getGroups: () => this.client.getGroups(),
            disconnect: () => this.client.disconnect(),
            init: () => this.client.connect(),
            setHandler: () => {}, // El nuevo bot ya maneja los eventos internamente
            setDiffusionService: (service: any) => { this.diffusionService = service; }
        };
    }
}
