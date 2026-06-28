import { WhatsAppClient } from '../../infrastructure/whatsapp/client';
import fs from 'fs';
import path from 'path';
import { getSettings } from '../../core/memory';

/**
 * MODULE LAYER - MESSAGES
 * Este servicio contiene la lógica de negocio de los mensajes.
 */
export class MessageService {
    constructor(private client: WhatsAppClient) {}

    getStatus() {
        return this.client.getStatus();
    }

    async disconnect() {
        return await this.client.disconnect();
    }

    async getGroups() {
        return await this.client.getGroups();
    }

    async requestPairingCode(phoneNumber: string) {
        return await this.client.requestPairingCode(phoneNumber);
    }

    private formatJid(jid: string): string {
        if (!jid) return '';
        const clean = jid.trim();
        
        // Si ya tiene el sufijo @, lo dejamos como está
        if (clean.includes('@')) return clean;

        // Si contiene un guion, empieza con '1203' o es un número puro de 18 dígitos, es un ID de grupo
        const digitsOnly = clean.replace(/\D/g, '');
        if (clean.includes('-') || digitsOnly.startsWith('1203') || digitsOnly.length === 18) {
            return `${clean}@g.us`;
        }

        // Si es solo números, lo tratamos como chat individual
        let numbers = digitsOnly;
        if (numbers.length === 10) {
            numbers = `521${numbers}`;
        }
        return `${numbers}@s.whatsapp.net`;
    }

    async sendMessage(jid: string, text: string) {
        const target = this.formatJid(jid);
        
        // Simular escritura solo para chats individuales
        // En grupos puede causar errores not-acceptable en sesiones nuevas
        if (!target.endsWith('@g.us')) {
            const typingTime = Math.min(text.length * 50, 4000);
            await this.client.sendPresence(target, 'composing');
            await new Promise(r => setTimeout(r, 1000 + Math.random() * typingTime));
            await this.client.sendPresence(target, 'paused');
        } else {
            // Pausa mínima para no saturar
            await new Promise(r => setTimeout(r, 500));
        }

        return await this.client.sendRaw(target, { text });
    }

    async sendMedia(jid: string, filePath: string, caption?: string, mimeType?: string, fileName?: string) {
        const target = this.formatJid(jid);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }

        const ext = path.extname(filePath).toLowerCase();
        const buffer = fs.readFileSync(filePath);
        const message: any = { caption };
        let isAudio = false;

        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
            message.image = buffer;
        } else if (ext === '.mp4' || (mimeType && mimeType.startsWith('video/'))) {
            message.video = buffer;
        } else if (['.mp3', '.ogg', '.wav'].includes(ext) || (mimeType && mimeType.startsWith('audio/'))) {
            message.audio = buffer;
            message.mimetype = mimeType || (ext === '.ogg' ? 'audio/ogg; codecs=opus' : 'audio/mpeg');
            message.ptt = true;
            delete message.caption;
            isAudio = true;
        } else {
            message.document = buffer;
            message.mimetype = mimeType || 'application/octet-stream';
            message.fileName = fileName || path.basename(filePath);
        }

        // Simular presencia de carga para chats individuales
        if (!target.endsWith('@g.us')) {
            if (isAudio) {
                // Simular "Grabando audio..." por 2 a 4 segundos
                await this.client.sendPresence(target, 'recording');
                await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
            } else {
                // Simular "Escribiendo..." por 1.5 a 3 segundos
                await this.client.sendPresence(target, 'composing');
                await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
            }
            await this.client.sendPresence(target, 'paused');
        }

        return await this.client.sendRaw(target, message);
    }

    async sendMediaFromUrl(jid: string, url: string, caption?: string, mediaType: 'image' | 'document' | 'video' | 'audio' = 'image') {
        const target = this.formatJid(jid);
        
        // Transformar automáticamente enlaces de Google Drive normales a descarga directa
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch) {
            url = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
        }

        // Simular presencia de carga para chats individuales
        if (!target.endsWith('@g.us')) {
            if (mediaType === 'audio') {
                await this.client.sendPresence(target, 'recording');
            } else {
                await this.client.sendPresence(target, 'composing');
            }
            await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
            await this.client.sendPresence(target, 'paused');
        }

        const messageContent: any = { caption };
        if (mediaType === 'image') {
            messageContent.image = { url };
        } else if (mediaType === 'document') {
            messageContent.document = { url };
            try {
                const urlParts = url.split('?')[0].split('/');
                let name = urlParts[urlParts.length - 1];
                if (!name || name.length < 3) name = 'documento.pdf';
                messageContent.fileName = name;
            } catch (e) {
                messageContent.fileName = 'documento.pdf';
            }
            // Mimetype genérico, Baileys suele poder determinarlo o requiere uno. 
            // Si sabemos que es PDF:
            if (url.toLowerCase().includes('.pdf')) messageContent.mimetype = 'application/pdf';
            else messageContent.mimetype = 'application/octet-stream';
        } else if (mediaType === 'video') {
            messageContent.video = { url };
        } else if (mediaType === 'audio') {
            messageContent.audio = { url };
            messageContent.ptt = true;
            delete messageContent.caption;
        }

        return await this.client.sendRaw(target, messageContent);
    }

    /**
     * Lógica orquestada para manejar mensajes entrantes (IA + Voz)
     */
    async handleIncoming(jid: string, text: string, senderJid: string, imageBase64?: string) {
        // Esta lógica ahora se delega desde el core/router.ts o se usa aquí
        // Por ahora mantenemos la compatibilidad con los métodos que el Controller espera
        console.log(`[MessageService] Handling message from ${jid}: ${text.substring(0, 20)}...`);
    }
}
