import { WhatsAppClient } from '../../infrastructure/whatsapp/client';
import fs from 'fs';
import path from 'path';
import { getSettings } from '../../core/memory';
import axios from 'axios';
import { safeDownload } from '../../utils/safeHttp';
import { formatWhatsAppJid } from '../../utils/formatters';

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

    purgePreKeys() {
        this.client.purgePreKeys();
    }

    async requestPairingCode(phoneNumber: string) {
        return await this.client.requestPairingCode(phoneNumber);
    }

    private formatJid(jid: string): string {
        return formatWhatsAppJid(jid);
    }

    async sendMessage(jid: string, text: string) {
        if (!text || typeof text !== 'string' || text.trim() === '') {
            throw new Error('[MessageService] No se puede enviar un mensaje con texto vacío.');
        }
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
        const extension = (fileName ? path.extname(fileName) : ext).toLowerCase();
        let resolvedMimeType = mimeType || 'application/octet-stream';
        
        // Corregir mimetypes genéricos basados en la extensión real del archivo
        if (resolvedMimeType === 'application/octet-stream' || !resolvedMimeType || resolvedMimeType.includes('html')) {
            const mimeMap: Record<string, string> = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.txt': 'text/plain',
                '.csv': 'text/csv',
                '.zip': 'application/zip',
                '.rar': 'application/vnd.rar',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.mp4': 'video/mp4',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg'
            };
            if (mimeMap[extension]) {
                resolvedMimeType = mimeMap[extension];
            }
        }

        const buffer = await fs.promises.readFile(filePath);
        const message: any = { caption };
        let isAudio = false;

        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext) || (resolvedMimeType && resolvedMimeType.startsWith('image/'))) {
            message.image = buffer;
        } else if (ext === '.mp4' || (resolvedMimeType && resolvedMimeType.startsWith('video/'))) {
            message.video = buffer;
        } else if (['.mp3', '.ogg', '.wav'].includes(ext) || (resolvedMimeType && resolvedMimeType.startsWith('audio/'))) {
            message.audio = buffer;
            message.mimetype = resolvedMimeType || (ext === '.ogg' ? 'audio/ogg; codecs=opus' : 'audio/mpeg');
            message.ptt = true;
            delete message.caption;
            isAudio = true;
        } else {
            message.document = buffer;
            message.mimetype = resolvedMimeType;
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
        
        let downloadUrl = url.trim();

        // 1. Transformar automáticamente enlaces de Google Drive normales a descarga directa
        const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|drive\.google\.com\/.*[?&]id=)([a-zA-Z0-9_-]+)/i;
        const driveMatch = downloadUrl.match(driveRegex);
        if (driveMatch) {
            const fileId = driveMatch[1];
            downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
        }

        // 2. Transformar Google Docs / Sheets / Slides para exportar a PDF automáticamente
        const docMatch = downloadUrl.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
        if (docMatch) {
            downloadUrl = `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
            mediaType = 'document';
        }
        const sheetMatch = downloadUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
        if (sheetMatch) {
            downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=pdf`;
            mediaType = 'document';
        }
        const slideMatch = downloadUrl.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
        if (slideMatch) {
            downloadUrl = `https://docs.google.com/presentation/d/${slideMatch[1]}/export?format=pdf`;
            mediaType = 'document';
        }

        // 3. Transformar Dropbox para descarga directa
        if (downloadUrl.includes('dropbox.com') && downloadUrl.includes('dl=0')) {
            downloadUrl = downloadUrl.replace('dl=0', 'dl=1');
        }

        console.log(`[MessageService] Descargando multimedia desde URL (${downloadUrl.substring(0, 80)}...) para enviar a ${target}`);
        
        let response: { data: Buffer; headers: Record<string, any>; contentType?: string };
        try {
            response = await safeDownload(downloadUrl, {
                timeoutMs: 30000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                }
            });
        } catch (error: any) {
            // Si falló el endpoint principal de Drive, reintentar con el endpoint secundario
            if (driveMatch) {
                try {
                    const fallbackDriveUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}&confirm=t`;
                    response = await safeDownload(fallbackDriveUrl, {
                        timeoutMs: 30000,
                        maxRedirects: 5,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': '*/*'
                        }
                    });
                } catch (retryError: any) {
                    console.error(`[MessageService] Error al descargar de Google Drive (${downloadUrl}):`, retryError.message);
                    throw new Error(`Error al descargar archivo de Google Drive: ${retryError.message}`);
                }
            } else {
                console.error(`[MessageService] Error al descargar de URL (${downloadUrl}):`, error.message);
                throw new Error(`Error al descargar archivo: ${error.message}`);
            }
        }

        // Validar si el servidor devolvió una página HTML en lugar del archivo binario
        const buffer = response.data;
        const headerPreview = buffer.subarray(0, 500).toString('utf-8').toLowerCase();
        if (headerPreview.includes('<!doctype html') || headerPreview.includes('<html')) {
            throw new Error('El enlace devolvió una página web de Google en lugar de un archivo directo. Asegúrate de que el archivo esté compartido públicamente como "Lector".');
        }

        // Obtener mimetype
        const contentType = String(response.headers['content-type'] || '');
        let mimeType = contentType.split(';')[0].trim();
        
        // Resolver extensión y nombre del archivo
        let fileName = 'archivo';
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition && typeof contentDisposition === 'string') {
            const filenameMatch = contentDisposition.match(/filename\*?=["']?(?:UTF-8'')?([^;"']+)["']?/i);
            if (filenameMatch) {
                fileName = decodeURIComponent(filenameMatch[1]);
            } else {
                const simpleMatch = contentDisposition.match(/filename\s*=\s*["']?([^;"']+)["']?/i);
                if (simpleMatch) {
                    fileName = simpleMatch[1];
                }
            }
        } else {
            // Intentar obtener del path de la URL original
            try {
                const urlPath = new URL(url).pathname;
                const base = path.basename(urlPath);
                if (base && base.includes('.')) {
                    fileName = base;
                }
            } catch (e) {}
        }

        // Si no se pudo determinar un nombre con extensión, asignamos uno genérico según tipo
        if (fileName === 'archivo' || !fileName.includes('.')) {
            let ext = '';
            if (mediaType === 'image') ext = '.jpg';
            else if (mediaType === 'video') ext = '.mp4';
            else if (mediaType === 'audio') ext = '.mp3';
            else ext = '.pdf';
            
            if (mimeType.includes('pdf')) ext = '.pdf';
            else if (mimeType.includes('png')) ext = '.png';
            else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
            else if (mimeType.includes('mp4')) ext = '.mp4';
            else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = '.mp3';
            
            fileName = `${fileName}${ext}`;
        }

        // Si es PDF y no tiene la extensión asignada, se la forzamos
        if ((mimeType === 'application/pdf' || mediaType === 'document') && !fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
            mimeType = 'application/pdf';
        }

        // Corregir mimeType si vino vacío o genérico
        if (!mimeType || mimeType === 'text/html' || mimeType === 'application/octet-stream') {
            if (fileName.toLowerCase().endsWith('.pdf') || mediaType === 'document') mimeType = 'application/pdf';
            else if (fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
            else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (fileName.toLowerCase().endsWith('.mp4')) mimeType = 'video/mp4';
            else if (fileName.toLowerCase().endsWith('.mp3')) mimeType = 'audio/mpeg';
        }

        // Guardar temporalmente en data/temp
        const tempDir = path.resolve('data/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, `${Date.now()}_${fileName}`);
        await fs.promises.writeFile(tempPath, buffer);

        console.log(`[MessageService] Guardado temporalmente en ${tempPath}. Enviando a WhatsApp...`);

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

        try {
            // Enviar archivo local
            return await this.sendMedia(target, tempPath, caption, mimeType, fileName);
        } finally {
            // Eliminar temporal
            try {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            } catch (e: any) {
                console.warn('[MessageService] No se pudo borrar archivo temporal:', e.message);
            }
        }
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
