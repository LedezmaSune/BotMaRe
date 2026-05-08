import fs from 'fs';
import path from 'path';
import { MessageService } from './message.service';
import { Contact } from '../../types';
import { processVariables } from '../../utils/variables';
import { logAudit } from '../../core/memory';

export class MassDiffusionService {
    private isProcessing = false;

    constructor(private waService: MessageService) {}

    async sendMass(contacts: Contact[], rawMessage: string, mediaPath?: string, mediaType?: string, fileName?: string) {
        if (this.isProcessing) {
             console.warn("[Mass] A mass diffusion is already in progress. Queueing is not yet implemented.");
        }

        // Run in background
        this.processQueue(contacts, rawMessage, mediaPath, mediaType, fileName).catch(err => {
            console.error("[Mass] Fatal error in processQueue:", err);
        });

        return contacts.length;
    }

    private async processQueue(contacts: Contact[], rawMessage: string, mediaPath?: string, mediaType?: string, fileName?: string) {
        this.isProcessing = true;
        const logs: any[] = [];
        for (const contact of contacts) {
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
                
                if (mediaPath && mediaType && fs.existsSync(mediaPath)) {
                    await this.waService.sendMedia(to, mediaPath, personalizedMessage, mediaType, fileName);
                } else {
                    await this.waService.sendMessage(to, personalizedMessage);
                }

                logEntry.status = 'success';
                logs.push(logEntry);

                // Delay between contacts (3-6s) to avoid bans
                const delay = 3000 + Math.random() * 3000;
                await new Promise(r => setTimeout(r, delay));
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

        this.isProcessing = false;
    }
}
