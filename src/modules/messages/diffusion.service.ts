import fs from 'fs';
import path from 'path';
import { MessageService } from './message.service';
import { Contact } from '../../types';
import { processVariables } from '../../utils/variables';
import { logAudit } from '../../core/memory';
import { globalEvents, EVENTS } from '../../core/events';
import { SmsService } from '../sms/sms.service';

export class MassDiffusionService {
    private isProcessing = false;
    private shouldStop = false;
    private currentProgress: { current: number, total: number, percentage: number } | null = null;

    constructor(private waService: MessageService, private smsService: SmsService) {}

    async sendMass(contacts: Contact[], rawMessage: string, mediaFiles?: { path: string, type: string, name: string }[], channel: string = 'whatsapp') {
        if (this.isProcessing) {
             console.warn("[Mass] A mass diffusion is already in progress. Ignoring request.");
             return -1;
        }

        this.shouldStop = false;
        // Run in background
        this.processQueue(contacts, rawMessage, mediaFiles, channel).catch(err => {
            console.error("[Mass] Fatal error in processQueue:", err);
        });

        return contacts.length;
    }

    stopProcessing() {
        if (this.isProcessing) {
            this.shouldStop = true;
            console.log("[Mass] Cancellation requested...");
            return true;
        }
        return false;
    }

    getCurrentProgress() {
        return this.currentProgress;
    }

    private async processQueue(contacts: Contact[], rawMessage: string, mediaFiles?: { path: string, type: string, name: string }[], channel: string = 'whatsapp') {
        this.isProcessing = true;
        
        // Emitir progreso inicial (0%) para que el UI sepa que hemos empezado
        this.currentProgress = {
            current: 0,
            total: contacts.length,
            percentage: 0
        };
        globalEvents.emit(EVENTS.DIFFUSION_PROGRESS, this.currentProgress);
        
        const logs: any[] = [];
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];

            // --- VERIFICACIÓN DE CONEXIÓN ---
            // Si perdemos la conexión, esperamos a que el bot se reconecte antes de seguir
            // para evitar que toda la cola falle en cadena. Solo aplica si es WhatsApp.
            if (channel === 'whatsapp') {
                while (this.waService.getStatus().state !== 'connected' && !this.shouldStop) {
                    console.warn("[Mass] Conexión WA perdida. Pausando cola hasta reconexión...");
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            // --------------------------------

            if (this.shouldStop) {
                console.log("[Mass] Diffusion cancelled by user.");
                await logAudit('system', 'MASS_DIFFUSION_CANCELLED', {
                    processed: logs.length,
                    total: contacts.length,
                    message: rawMessage
                });
                break;
            }

            const logEntry: {
                name?: string;
                number: string;
                status: 'pending' | 'success' | 'failed' | 'skipped';
                time: string;
                error: string | null;
            } = {
                name: contact.name,
                number: contact.number,
                status: 'pending',
                time: new Date().toLocaleTimeString(),
                error: null
            };

            const to = contact.number;
            if (!to || to.trim() === '') {
                logEntry.status = 'skipped';
                logEntry.error = 'Número inválido';
                logs.push(logEntry);
                
                this.currentProgress = {
                    current: logs.length,
                    total: contacts.length,
                    percentage: Math.round((logs.length / contacts.length) * 100)
                };
                globalEvents.emit(EVENTS.DIFFUSION_PROGRESS, this.currentProgress);
                globalEvents.emit(EVENTS.DIFFUSION_LOG, {
                    name: contact.name || 'Sin nombre',
                    number: to || 'Vacío',
                    status: 'skipped',
                    index: logs.length,
                    total: contacts.length
                });
                continue;
            }

            const personalizedMessage = processVariables(rawMessage, contact.name || '');

            try {
                console.log(`[Mass] Sending (${logs.length + 1}/${contacts.length}) to ${to}...`);
                
                if (mediaFiles && mediaFiles.length > 0) {
                    let sentAny = false;
                    let errors: string[] = [];
                    for (let j = 0; j < mediaFiles.length; j++) {
                        const file = mediaFiles[j];
                        if (fs.existsSync(file.path)) {
                            try {
                                // Enviar caption solo en el primer archivo multimedia enviado exitosamente
                                const caption = !sentAny ? personalizedMessage : '';
                                const sendPromise = this.waService.sendMedia(to, file.path, caption, file.type, file.name);
                                await Promise.race([
                                    sendPromise,
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en envío (60s)')), 60000))
                                ]);
                                sentAny = true;
                            } catch (err: any) {
                                console.error(`[Mass] Error al enviar archivo ${file.name} a ${to}:`, err.message);
                                errors.push(`${file.name}: ${err.message}`);
                            }
                        } else {
                            errors.push(`${file.name}: Archivo no existe en disco`);
                        }
                    }
                    if (!sentAny && errors.length > 0) {
                        throw new Error(`Fallo el envío de todos los archivos. Errores: ${errors.join(', ')}`);
                    }
                } else {
                    const mediaMatch = personalizedMessage.match(/\[(IMG|DOC|VIDEO|AUDIO|MEDIA):\s*(.+?)\]/i);
                    if (mediaMatch) {
                        const tagType = mediaMatch[1].toUpperCase();
                        const content = mediaMatch[2].trim();
                        const textWithoutMedia = personalizedMessage.replace(mediaMatch[0], '').trim();
                        
                        let mediaUrl = content;
                        let mediaCategory: 'image' | 'document' | 'video' | 'audio' = 'document';

                        if (tagType === 'IMG' || tagType === 'MEDIA') {
                            mediaCategory = 'image';
                            if (!content.startsWith('http')) {
                                mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(content)}?nologo=true`;
                            }
                        } else if (tagType === 'VIDEO') {
                            mediaCategory = 'video';
                        } else if (tagType === 'AUDIO') {
                            mediaCategory = 'audio';
                        }

                        const sendPromise = this.waService.sendMediaFromUrl(to, mediaUrl, textWithoutMedia || undefined, mediaCategory);
                        await Promise.race([
                            sendPromise,
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en envío (60s)')), 60000))
                        ]);
                    } else {
                        if (channel === 'sms') {
                            const sendPromise = this.smsService.sendMessage(to, personalizedMessage);
                            await Promise.race([
                                sendPromise,
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout SMS en envío (60s)')), 60000))
                            ]);
                        } else {
                            const sendPromise = this.waService.sendMessage(to, personalizedMessage);
                            await Promise.race([
                                sendPromise,
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en envío (60s)')), 60000))
                            ]);
                        }
                    }
                }

                logEntry.status = 'success';
            } catch (error: any) {
                console.error(`[Mass] Failed to send to ${contact.number}:`, error.message);
                logEntry.status = 'failed';
                logEntry.error = error.message;
            }

            logs.push(logEntry);

            // Emitir log individual para la interfaz en tiempo real
            globalEvents.emit(EVENTS.DIFFUSION_LOG, {
                name: contact.name || 'Sin nombre',
                number: contact.number,
                status: logEntry.status,
                index: logs.length,
                total: contacts.length,
                error: logEntry.error
            });

            // Actualizar y emitir progreso general al bus global
            this.currentProgress = {
                current: logs.length,
                total: contacts.length,
                percentage: Math.round((logs.length / contacts.length) * 100)
            };
            globalEvents.emit(EVENTS.DIFFUSION_PROGRESS, this.currentProgress);

            // --- PROTECCIÓN ANTI-BAN CON PAUSAS INTELIGENTES ---
            if (i < contacts.length - 1 && !this.shouldStop) {
                let delay = 3500 + Math.random() * 3500; // 3.5 - 7 segundos base
                
                // Retraso adicional proporcional a la longitud del mensaje
                const charCount = personalizedMessage?.length || 0;
                const writingJitter = Math.min(charCount * 12, 4000);
                delay += writingJitter;
                
                // Pausa larga cada 10 mensajes (Burst Protection)
                if ((i + 1) % 10 === 0) {
                    console.log(`[Mass] Pausa de seguridad Burst Protection (15-20s)...`);
                    delay += 12000 + Math.random() * 8000;
                }

                console.log(`[Mass] Esperando ${Math.round(delay / 1000)}s antes del siguiente contacto...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        console.log(`[Mass] Completed diffusion to ${contacts.length} contacts`);
        
        // Log the whole campaign to Audits
        await logAudit('system', 'MASS_DIFFUSION_CAMPAIGN', {
            total: contacts.length,
            success: logs.filter(l => l.status === 'success').length,
            failed: logs.filter(l => l.status === 'failed').length,
            message: rawMessage,
            details: logs
        });

        globalEvents.emit(EVENTS.DIFFUSION_COMPLETED, {
            total: contacts.length,
            success: logs.filter(l => l.status === 'success').length
        });

        this.currentProgress = null;
        this.isProcessing = false;
    }
}
