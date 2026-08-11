import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';

describe('Reminder Time Parsing Rules', () => {
    const zone = 'America/Mexico_City';
    const mockNow = DateTime.fromISO('2026-08-11T10:00:00', { zone });

    function parseTestTime(rawTime: string, now: DateTime): { isImmediate: boolean; dateTime?: DateTime; isValid: boolean } {
        const reminderTime = (rawTime || '').trim();

        if (['inmediato', 'ahora', 'inmediatamente'].includes(reminderTime.toLowerCase())) {
            return { isImmediate: true, isValid: true };
        }

        let normalized = reminderTime;
        if (normalized.toLowerCase().includes('mañana')) {
            const tomorrow = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
            const timeMatch = normalized.match(/(\d{1,2}):(\d{2})/);
            const timePart = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '08:00';
            normalized = `${tomorrow}T${timePart}`;
        } else if (normalized.length === 5 && normalized.includes(':')) {
            normalized = `${now.toFormat('yyyy-MM-dd')}T${normalized}`;
        } else if (normalized.includes(' ') && !normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T');
        }

        const dt = DateTime.fromISO(normalized, { zone });
        return {
            isImmediate: false,
            dateTime: dt.isValid ? dt : undefined,
            isValid: dt.isValid
        };
    }

    it('identifies immediate keywords correctly', () => {
        expect(parseTestTime('inmediato', mockNow).isImmediate).toBe(true);
        expect(parseTestTime('ahora', mockNow).isImmediate).toBe(true);
        expect(parseTestTime('inmediatamente', mockNow).isImmediate).toBe(true);
    });

    it('parses standard ISO date strings', () => {
        const res = parseTestTime('2026-08-11T10:30', mockNow);
        expect(res.isValid).toBe(true);
        expect(res.dateTime?.hour).toBe(10);
        expect(res.dateTime?.minute).toBe(30);
    });

    it('parses short HH:mm by prepending current date', () => {
        const res = parseTestTime('15:45', mockNow);
        expect(res.isValid).toBe(true);
        expect(res.dateTime?.toFormat('yyyy-MM-dd')).toBe('2026-08-11');
        expect(res.dateTime?.hour).toBe(15);
        expect(res.dateTime?.minute).toBe(45);
    });

    it('parses natural language "mañana a las 14:00"', () => {
        const res = parseTestTime('mañana a las 14:00', mockNow);
        expect(res.isValid).toBe(true);
        expect(res.dateTime?.toFormat('yyyy-MM-dd')).toBe('2026-08-12');
        expect(res.dateTime?.hour).toBe(14);
        expect(res.dateTime?.minute).toBe(0);
    });

    it('normalizes space-separated datetime "2026-08-11 18:30"', () => {
        const res = parseTestTime('2026-08-11 18:30', mockNow);
        expect(res.isValid).toBe(true);
        expect(res.dateTime?.hour).toBe(18);
        expect(res.dateTime?.minute).toBe(30);
    });
});
