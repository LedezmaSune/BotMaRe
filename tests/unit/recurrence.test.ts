import { describe, it, expect } from 'vitest';
import { RecurrenceService } from '../../src/modules/scheduling/services/recurrence.service';

describe('RecurrenceService', () => {
    const baseTime = '2026-08-10T10:00'; // Monday

    it('returns null if repeat is none or undefined', () => {
        expect(RecurrenceService.calculateNextTime({ time: baseTime, repeat: 'none' })).toBeNull();
        expect(RecurrenceService.calculateNextTime({ time: baseTime })).toBeNull();
    });

    it('calculates hourly recurrence correctly', () => {
        const next = RecurrenceService.calculateNextTime({ time: baseTime, repeat: 'hourly' });
        expect(next).toBe('2026-08-10T11:00');
    });

    it('calculates daily recurrence correctly', () => {
        const next = RecurrenceService.calculateNextTime({ time: baseTime, repeat: 'daily' });
        expect(next).toBe('2026-08-11T10:00');
    });

    it('calculates weekdays recurrence correctly skipping weekends', () => {
        // Friday to Monday
        const fridayTime = '2026-08-14T10:00'; // Friday
        const next = RecurrenceService.calculateNextTime({ time: fridayTime, repeat: 'weekdays' });
        expect(next).toBe('2026-08-17T10:00'); // Monday
    });

    it('calculates weekly recurrence correctly', () => {
        const next = RecurrenceService.calculateNextTime({ time: baseTime, repeat: 'weekly' });
        expect(next).toBe('2026-08-17T10:00');
    });

    it('calculates monthly recurrence correctly', () => {
        const next = RecurrenceService.calculateNextTime({ time: baseTime, repeat: 'monthly' });
        expect(next).toBe('2026-09-10T10:00');
    });

    it('calculates yearly recurrence correctly', () => {
        const next = RecurrenceService.calculateNextTime({ time: baseTime, repeat: 'yearly' });
        expect(next).toBe('2027-08-10T10:00');
    });

    it('calculates advanced recurrence correctly', () => {
        const next = RecurrenceService.calculateNextTime({
            time: baseTime,
            repeat: 'advanced',
            repeatInterval: 3,
            repeatUnit: 'hours'
        });
        expect(next).toBe('2026-08-10T13:00');
    });
});
