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

    private formatJid(jid: string): string {
        if (!jid) return '';
        const clean = jid.trim();
        if (clean.includes('@')) return clean;
        let numbers = clean.replace(/\D/g, '');
        if (numbers.length === 10) {
            numbers = `521${numbers}`;
        }
        return `${numbers}@s.whatsapp.net`;
    }

    async sendMessage(jid: string, text: string) {
        const target = this.formatJid(jid);
        
        // Simular escritura (Escribiendo...)
        const typingTime = Math.min(text.length * 50, 4000); // Máximo 4 segundos de escritura
        await this.client.sendPresence(target, 'composing');
        await new Promise(r => setTimeout(r, 1000 + Math.random() * typingTime));
        await this.client.sendPresence(target, 'paused');

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

        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
            message.image = buffer;
        } else if (ext === '.mp4' || (mimeType && mimeType.startsWith('video/'))) {
            message.video = buffer;
        } else if (['.mp3', '.ogg', '.wav'].includes(ext) || (mimeType && mimeType.startsWith('audio/'))) {
            message.audio = buffer;
            message.mimetype = mimeType || (ext === '.ogg' ? 'audio/ogg; codecs=opus' : 'audio/mpeg');
            message.ptt = true;
            delete message.caption;
        } else {
            message.document = buffer;
            message.mimetype = mimeType || 'application/octet-stream';
            message.fileName = fileName || path.basename(filePath);
        }

        return await this.client.sendRaw(target, message);
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
