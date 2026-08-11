import axios from 'axios';
import { formatSmsNumber } from '../../utils/formatters';
import { getConfig } from '../../core/config';

export class SmsService {
    private apiKey: string;
    private fromNumbers: string[];
    private apiUrl: string;
    private currentIndex: number = 0;

    constructor() {
        this.apiKey = process.env.HTTPSMS_API_KEY || '';
        const rawNumbers = process.env.HTTPSMS_FROM_NUMBER || '';
        this.fromNumbers = rawNumbers.split(',').map(n => n.trim()).filter(n => n !== '');
        this.apiUrl = process.env.HTTPSMS_API_URL || 'https://api-sms.apptienda.online/v1/messages/send';
    }

    async getAvailableNumbers(): Promise<string[]> {
        const rawNumbers = await getConfig('HTTPSMS_FROM_NUMBER', process.env.HTTPSMS_FROM_NUMBER || '');
        const numbers = rawNumbers.split(',').map(n => n.trim()).filter(n => n !== '');
        return numbers.length > 0 ? numbers : this.fromNumbers;
    }

    cleanNumber(target: string): string {
        return formatSmsNumber(target);
    }

    async sendMessage(targetId: string, content: string): Promise<boolean> {
        // Carga dinámica de ajustes desde base de datos o variables de entorno
        const apiKey = await getConfig('HTTPSMS_API_KEY', this.apiKey || process.env.HTTPSMS_API_KEY || '');
        const rawNumbers = await getConfig('HTTPSMS_FROM_NUMBER', process.env.HTTPSMS_FROM_NUMBER || '');
        const dynamicNumbers = rawNumbers.split(',').map(n => n.trim()).filter(n => n !== '');
        const fromNumbers = dynamicNumbers.length > 0 ? dynamicNumbers : this.fromNumbers;
        const apiUrl = await getConfig('HTTPSMS_API_URL', this.apiUrl || process.env.HTTPSMS_API_URL || 'https://api-sms.apptienda.online/v1/messages/send');

        if (!apiKey || fromNumbers.length === 0) {
            console.error('[SmsService] Error: HTTPSMS_API_KEY o HTTPSMS_FROM_NUMBER no están configurados en .env ni en los ajustes');
            throw new Error('El servicio de SMS no está configurado (falta API Key o número remitente)');
        }

        // Seleccionar número emisor actual usando Round-Robin
        const rawFrom = fromNumbers[this.currentIndex % fromNumbers.length];
        const fromNumber = this.cleanNumber(rawFrom);
        // Avanzar el índice al siguiente número
        this.currentIndex = (this.currentIndex + 1) % fromNumbers.length;

        const to = this.cleanNumber(targetId);

        if (!to) {
            console.error(`[SmsService] Número destino inválido: "${targetId}"`);
            throw new Error(`Número telefónico de destino inválido: ${targetId}`);
        }
        
        try {
            const response = await axios.post(
                apiUrl,
                {
                    content,
                    from: fromNumber,
                    to
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.status >= 200 && response.status < 300) {
                return true;
            }
            throw new Error(`Unexpected status code: ${response.status}`);
        } catch (error: any) {
            console.error(`[SmsService] Error enviando SMS a ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }
}

