import { DateTime } from 'luxon';

export interface RecurrenceOptions {
    time: string; // ISO string or parsable format
    repeat?: string; // 'none' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'advanced'
    repeatInterval?: number;
    repeatUnit?: string; // 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
    zone?: string;
}

export class RecurrenceService {
    private static readonly DEFAULT_ZONE = 'America/Mexico_City';

    /**
     * Calcula la próxima fecha de ejecución en base a la configuración de repetición.
     * Retorna una cadena con formato "yyyy-MM-dd'T'HH:mm" o null si no aplica repetición.
     */
    static calculateNextTime(options: RecurrenceOptions): string | null {
        const { time, repeat, repeatInterval, repeatUnit, zone = this.DEFAULT_ZONE } = options;

        if (!repeat || repeat === 'none') {
            return null;
        }

        let baseDate = DateTime.fromISO(time, { zone });
        if (!baseDate.isValid) {
            baseDate = DateTime.now().setZone(zone);
        }

        let nextTime = baseDate;
        let validRepeat = false;

        switch (repeat) {
            case 'hourly':
                nextTime = nextTime.plus({ hours: 1 });
                validRepeat = true;
                break;

            case 'daily':
                nextTime = nextTime.plus({ days: 1 });
                validRepeat = true;
                break;

            case 'weekdays':
                nextTime = nextTime.plus({ days: 1 });
                // En Luxon: 1 = Lunes, ..., 5 = Viernes, 6 = Sábado, 7 = Domingo
                while (nextTime.weekday > 5) {
                    nextTime = nextTime.plus({ days: 1 });
                }
                validRepeat = true;
                break;

            case 'weekly':
                nextTime = nextTime.plus({ weeks: 1 });
                validRepeat = true;
                break;

            case 'monthly':
                nextTime = nextTime.plus({ months: 1 });
                validRepeat = true;
                break;

            case 'yearly':
                nextTime = nextTime.plus({ years: 1 });
                validRepeat = true;
                break;

            case 'advanced':
                if (repeatInterval && repeatInterval > 0 && repeatUnit) {
                    const validUnits: Record<string, string> = {
                        minutes: 'minutes',
                        minute: 'minutes',
                        hours: 'hours',
                        hour: 'hours',
                        days: 'days',
                        day: 'days',
                        weeks: 'weeks',
                        week: 'weeks',
                        months: 'months',
                        month: 'months'
                    };
                    const unitKey = validUnits[repeatUnit.toLowerCase()];
                    if (unitKey) {
                        nextTime = nextTime.plus({ [unitKey]: repeatInterval });
                        validRepeat = true;
                    }
                }
                break;

            default:
                break;
        }

        if (validRepeat && nextTime.isValid) {
            return nextTime.toFormat("yyyy-MM-dd'T'HH:mm");
        }

        return null;
    }
}
