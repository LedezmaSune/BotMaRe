import axios from 'axios';

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

    getAvailableNumbers(): string[] {
        return this.fromNumbers;
    }

    private cleanNumber(target: string): string {
        let clean = target.replace(/[^0-9+]/g, '');
        
        // Remove '+' to count the digits
        const digitsOnly = clean.replace('+', '');
        
        // If it is exactly 10 digits, assume it's a Mexican number and prepend +52
        if (digitsOnly.length === 10) {
            return `+52${digitsOnly}`;
        }
        
        // If it's not 10 digits (e.g. they already included 52), just ensure it starts with +
        if (!clean.startsWith('+')) {
            return `+${clean}`;
        }
        
        return clean;
    }

    async sendMessage(targetId: string, content: string): Promise<boolean> {
        if (!this.apiKey || this.fromNumbers.length === 0) {
            console.error('[SmsService] Error: HTTPSMS_API_KEY or HTTPSMS_FROM_NUMBER is not set in .env');
            throw new Error('SMS service is not configured');
        }

        // Seleccionar número actual usando Round-Robin
        const fromNumber = this.fromNumbers[this.currentIndex];
        // Avanzar el índice al siguiente número (y volver a 0 si llegamos al final)
        this.currentIndex = (this.currentIndex + 1) % this.fromNumbers.length;

        const to = this.cleanNumber(targetId);
        
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    content,
                    from: fromNumber,
                    to
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status >= 200 && response.status < 300) {
                return true;
            }
            throw new Error(`Unexpected status code: ${response.status}`);
        } catch (error: any) {
            console.error(`[SmsService] Error sending SMS to ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }
}
