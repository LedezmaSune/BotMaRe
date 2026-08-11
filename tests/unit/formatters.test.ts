import { describe, it, expect } from 'vitest';
import { formatWhatsAppJid, formatSmsNumber } from '@/utils/formatters';
import { parseContactList } from '@/utils/contactParser';

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

describe('formatSmsNumber (Soporte Internacional)', () => {
    it('debe devolver vacío si no se pasa nada', () => {
        expect(formatSmsNumber('')).toBe('');
    });

    it('debe formatear números locales de México (10 dígitos) agregando +52', () => {
        expect(formatSmsNumber('8181234567')).toBe('+528181234567');
        expect(formatSmsNumber('5512345678')).toBe('+525512345678');
    });

    it('debe normalizar números de México con prefijo móvil de WhatsApp (+521 / 521 a +52)', () => {
        expect(formatSmsNumber('5218181234567')).toBe('+528181234567');
        expect(formatSmsNumber('+5218181234567')).toBe('+528181234567');
        expect(formatSmsNumber('5218181234567@s.whatsapp.net')).toBe('+528181234567');
    });

    it('debe formatear números de EE.UU. y Canadá (+1)', () => {
        expect(formatSmsNumber('+1 (415) 555-2671')).toBe('+14155552671');
        expect(formatSmsNumber('14155552671')).toBe('+14155552671');
        expect(formatSmsNumber('14155552671@s.whatsapp.net')).toBe('+14155552671');
    });

    it('debe formatear números de España (+34)', () => {
        expect(formatSmsNumber('+34 612 34 56 78')).toBe('+34612345678');
        expect(formatSmsNumber('34612345678')).toBe('+34612345678');
        expect(formatSmsNumber('0034612345678')).toBe('+34612345678');
    });

    it('debe formatear números de Argentina (+549)', () => {
        expect(formatSmsNumber('+54 9 11 2345-6789')).toBe('+5491123456789');
        expect(formatSmsNumber('5491123456789')).toBe('+5491123456789');
    });

    it('debe formatear números de Colombia (+57)', () => {
        expect(formatSmsNumber('+57 300 123 4567')).toBe('+573001234567');
        expect(formatSmsNumber('573001234567')).toBe('+573001234567');
    });

    it('debe formatear números de Chile (+56) y Perú (+51)', () => {
        expect(formatSmsNumber('+56 9 1234 5678')).toBe('+56912345678');
        expect(formatSmsNumber('+51 912 345 678')).toBe('+51912345678');
    });

    it('debe formatear números de Brasil (+55), Ecuador (+593), y otros países', () => {
        expect(formatSmsNumber('+55 11 91234-5678')).toBe('+5511912345678');
        expect(formatSmsNumber('+593 99 123 4567')).toBe('+593991234567');
        expect(formatSmsNumber('+44 7911 123456')).toBe('+447911123456');
    });
});

describe('parseContactList (Contactos Internacionales)', () => {
    it('debe parsear contactos con prefijo internacional y nombre', () => {
        const input = `+1 (415) 555-2671, John Doe\n+34612345678, Manuel\n+52 81 8123-4567, Carlos`;
        const result = parseContactList(input);
        expect(result).toHaveLength(3);
        expect(result[0].number).toBe('+14155552671');
        expect(result[0].name).toBe('John Doe');
        expect(result[1].number).toBe('+34612345678');
        expect(result[1].name).toBe('Manuel');
        expect(result[2].number).toBe('+528181234567');
        expect(result[2].name).toBe('Carlos');
    });
});


