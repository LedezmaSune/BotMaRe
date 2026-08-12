import { describe, it, expect } from 'vitest';
import { parseDateFromFilename } from '@/utils/dateParser';

describe('parseDateFromFilename (Fechas de Nacimiento y Variantes DD/MM/YYYY)', () => {
    const now = new Date();
    const currentYear = now.getFullYear();

    it('debe parsear DD/MM/YYYY con año de nacimiento histórico (ej: 15-08-1990)', () => {
        const res = parseDateFromFilename('Juan_15-08-1990.jpg', '10:00');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(15);
        expect(res?.month).toBe(8);
        expect(res?.birthYear).toBe(1990);
        expect(res?.isBirthday).toBe(true);
        // Si el 15 de agosto no ha pasado este año, scheduledYear = currentYear; si ya pasó, currentYear + 1
        const thisYearDate = new Date(currentYear, 7, 15, 23, 59, 59);
        const expectedYear = thisYearDate >= now ? currentYear : currentYear + 1;
        expect(res?.year).toBe(expectedYear);
        expect(res?.time).toBe(`${expectedYear}-08-15T10:00`);
    });

    it('debe parsear fechas con diagonales DD/MM/YYYY (ej: 23/11/1985)', () => {
        const res = parseDateFromFilename('foto_23/11/1985.png');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(23);
        expect(res?.month).toBe(11);
        expect(res?.birthYear).toBe(1985);
    });

    it('debe parsear fechas con puntos DD.MM.YYYY (ej: 05.02.1995)', () => {
        const res = parseDateFromFilename('cliente_05.02.1995_vip.jpg');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(5);
        expect(res?.month).toBe(2);
        expect(res?.birthYear).toBe(1995);
    });

    it('debe parsear fechas con guion bajo DD_MM_YYYY (ej: 10_03_2001)', () => {
        const res = parseDateFromFilename('10_03_2001.pdf');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(10);
        expect(res?.month).toBe(3);
        expect(res?.birthYear).toBe(2001);
    });

    it('debe parsear fechas de 2 dígitos DD/MM/YY (ej: 15-08-90 -> 1990)', () => {
        const res = parseDateFromFilename('15-08-90.jpg');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(15);
        expect(res?.month).toBe(8);
        expect(res?.birthYear).toBe(1990);
    });

    it('debe parsear fechas de 2 dígitos siglo XXI (ej: 12-04-05 -> 2005)', () => {
        const res = parseDateFromFilename('12-04-05.jpg');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(12);
        expect(res?.month).toBe(4);
        expect(res?.birthYear).toBe(2005);
    });

    it('debe parsear formato sin año DD-MM (ej: 15-08)', () => {
        const res = parseDateFromFilename('15-08.jpg');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(15);
        expect(res?.month).toBe(8);
        expect(res?.birthYear).toBeUndefined();
    });

    it('debe parsear formato compacto DDMMYYYY (ej: 15081990)', () => {
        const res = parseDateFromFilename('15081990.jpg');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(15);
        expect(res?.month).toBe(8);
        expect(res?.birthYear).toBe(1990);
    });

    it('debe respetar año explícito futuro (ej: 15-08-2030)', () => {
        const res = parseDateFromFilename('15-08-2030.jpg');
        expect(res).not.toBeNull();
        expect(res?.day).toBe(15);
        expect(res?.month).toBe(8);
        expect(res?.year).toBe(2030);
        expect(res?.isBirthday).toBe(false);
    });

    it('debe descartar nombres de archivos sin fechas válidas', () => {
        expect(parseDateFromFilename('logo_empresa.jpg')).toBeNull();
        expect(parseDateFromFilename('archivo_invalido_99-99-9999.jpg')).toBeNull();
    });
});
