import { describe, it, expect } from 'vitest';
import { formatWhatsAppJid } from '@/utils/formatters';

describe('formatWhatsAppJid', () => {
    it('debe devolver vacío si no se pasa nada', () => {
        expect(formatWhatsAppJid('')).toBe('');
    });

    it('no debe alterar jids que ya tienen @', () => {
        expect(formatWhatsAppJid('1234567890@s.whatsapp.net')).toBe('1234567890@s.whatsapp.net');
        expect(formatWhatsAppJid('1203631@g.us')).toBe('1203631@g.us');
    });

    it('debe identificar grupos por el guion y agregar @g.us', () => {
        expect(formatWhatsAppJid('1234567-987654321')).toBe('1234567-987654321@g.us');
    });

    it('debe identificar grupos por empezar con 1203 y agregar @g.us', () => {
        expect(formatWhatsAppJid('120363148123')).toBe('120363148123@g.us');
    });

    it('debe identificar grupos si tiene exactamente 18 dígitos y agregar @g.us', () => {
        expect(formatWhatsAppJid('123456789012345678')).toBe('123456789012345678@g.us');
    });

    it('debe agregar prefijo 521 si el número tiene 10 dígitos (México)', () => {
        expect(formatWhatsAppJid('8181234567')).toBe('5218181234567@s.whatsapp.net');
    });

    it('debe tratar como chat individual si es cualquier otra longitud', () => {
        expect(formatWhatsAppJid('14155552671')).toBe('14155552671@s.whatsapp.net'); // 11 digitos
    });
});
