import fs from 'fs';
import path from 'path';
import { MessageService } from './message.service';
import { Contact } from '../../types';
import { processVariables } from '../../utils/variables';
import { logAudit } from '../../core/memory';
import { globalEvents, EVENTS } from '../../core/events';

export class MassDiffusionService {
    private isProcessing = false;
    private shouldStop = false;
    private currentProgress: { current: number, total: number, percentage: number } | null = null;

    constructor(private waService: MessageService) {}

    async sendMass(contacts: Contact[], rawMessage: string, mediaFiles?: { path: string, type: string, name: string }[]) {
        if (this.isProcessing) {
             console.warn("[Mass] A mass diffusion is already in progress. Ignoring request.");
             return -1;
        }

        this.shouldStop = false;
        // Run in background
        this.processQueue(contacts, rawMessage, mediaFiles).catch(err => {
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

    private async processQueue(contacts: Contact[], rawMessage: string, mediaFiles?: { path: string, type: string, name: string }[]) {
        this.isProcessing = true;
        
        // Emitir progreso inicial (0%) para que el UI sepa que hemos empezado
        this.currentProgress = {
            current: 0,
            total: contacts.length,
            percentage: 0
        };
        globalEvents.emit(EVENTS.DIFFUSION_PROGRESS, this.currentProgress);
        
        const logs: any[] = [];
        for (const contact of contacts) {
            // --- VERIFICACIÓN DE CONEXIÓN ---
            // Si perdemos la conexión, esperamos a que el bot se reconecte antes de seguir
            // para evitar que toda la cola falle en cadena.
            while (this.waService.getStatus().state !== 'connected') {
                console.warn("[Mass] Conexión perdida. Pausando cola hasta reconexión...");
                await new Promise(r => setTimeout(r, 10000)); // Esperar 10s antes de re-verificar
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

            const logEntry = {
                name: contact.name,
                number: contact.number,
                status: 'pending',
                time: new Date().toLocaleTimeString(),
                error: null as string | null
            };

            try {
                const to = contact.number;
                if (!to || to.trim() === '') {
                    logEntry.status = 'skipped';
                    logEntry.error = 'Invalid number';
                    logs.push(logEntry);
                    continue;
                }
                
                const personalizedMessage = processVariables(rawMessage, contact.name || '');

                console.log(`[Mass] Sending to ${to}...`);
                
                if (mediaFiles && mediaFiles.length > 0) {
                    for (let i = 0; i < mediaFiles.length; i++) {
                        const file = mediaFiles[i];
                        if (fs.existsSync(file.path)) {
                            // Enviar caption solo en el primer archivo
                            const caption = i === 0 ? personalizedMessage : '';
                            const sendPromise = this.waService.sendMedia(to, file.path, caption, file.type, file.name);
                            await Promise.race([
                                sendPromise,
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en envío (30s)')), 30000))
                            ]);
                        }
                    }
                } else {
                    const sendPromise = this.waService.sendMessage(to, personalizedMessage);
                    await Promise.race([
                        sendPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en envío (30s)')), 30000))
                    ]);
                }

                logEntry.status = 'success';
                logs.push(logEntry);

                // Emitir log individual para el UI
                globalEvents.emit(EVENTS.DIFFUSION_LOG, {
                    name: contact.name,
                    number: contact.number,
                    status: 'success',
                    index: logs.length,
                    total: contacts.length
                });

                // --- PROTECCIÓN ANTI-BAN MEJORADA ---
                const index = logs.length;
                let delay = 5000 + Math.random() * 5000; // 5-10 segundos base
                
                // Pausa larga cada 10 mensajes (simular descanso humano)
                if (index % 10 === 0) {
                    console.log(`[Mass] Pausa de seguridad larga (Burst Protection)...`);
                    delay += 15000 + Math.random() * 10000; // +15-25 segundos extra
                }

                await new Promise(r => setTimeout(r, delay));
                // ------------------------------------

                // Emitir progreso al bus global
                this.currentProgress = {
                    current: logs.length,
                    total: contacts.length,
                    percentage: Math.round((logs.length / contacts.length) * 100)
                };
                globalEvents.emit(EVENTS.DIFFUSION_PROGRESS, this.currentProgress);
            } catch (error: any) {
                console.error(`[Mass] Failed to send to ${contact.number}:`, error.message);
                logEntry.status = 'failed';
                logEntry.error = error.message;
                logs.push(logEntry);
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
