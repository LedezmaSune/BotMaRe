import { WhatsAppClient } from '../infrastructure/whatsapp/client';
import { MessageService } from '../modules/messages/message.service';
import { AIService } from '../modules/ai/ai.service';
import { MessageController } from '../modules/messages/message.controller';
import { Router } from './router';
import { Server } from 'socket.io';

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

        // Mensajes entrantes hacia el Router
        this.client.onMessage = (data) => {
            this.router.handleWhatsAppMessage(data, this.client.getSocket());
        };
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
            getGroups: () => this.client.getGroups(),
            disconnect: () => this.client.disconnect(),
            init: () => this.client.connect(),
            setHandler: () => {} // El nuevo bot ya maneja los eventos internamente
        };
    }
}
