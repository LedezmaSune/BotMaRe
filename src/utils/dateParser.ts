/**
 * Parsea fechas y fechas de nacimiento a partir de nombres de archivos para auto-programación masiva.
 * 
 * Soporta todas las variantes de fecha:
 * - DD/MM/YYYY, DD-MM-YYYY, DD_MM_YYYY, DD.MM.YYYY, DD MM YYYY (ej. 15/08/1990, 15-08-1985)
 * - DD/MM/YY, DD-MM-YY, DD_MM_YY, DD.MM.YY (ej. 15/08/90, 15-08-85)
 * - DD/MM, DD-MM, DD_MM, DD.MM, DD MM (ej. 15/08, 15-08)
 * - YYYY/MM/DD, YYYY-MM-DD, YYYY_MM_DD, YYYY.MM.DD (ej. 1990/08/15, 1985-08-15)
 * - Compacto: DDMMYYYY (15081990), DDMMYY (150890), DDMM (1508)
 * - Con texto alrededor: "cumple_Juan_15-08-1990.jpg", "15-08-1985_maria.png", "cliente_15.08.1994_vip.jpg"
 * 
 * Manejo Inteligente de Fechas de Nacimiento (Cumpleaños):
 * - Si el archivo contiene un año histórico/nacimiento (ej. 1990, 1985, 2000, 1975 o cualquier año menor al actual):
 *   El sistema detecta el DÍA y MES de nacimiento y programa el recordatorio para el PRÓXIMO CUMPLEAÑOS
 *   (año actual si aún no ha ocurrido, o año siguiente si ya transcurrió en el año actual).
 * - Si el usuario indica un año futuro/actual explícito (ej. 2026, 2027), se programa para ese año exacto.
 * - Si no se indica año (ej. 15-08), se agenda para el año actual si no ha pasado, o para el año siguiente si ya pasó.
 */
export interface ParsedDateResult {
    date: string;
    time: string;
    day: number;
    month: number;
    year: number;
    birthYear?: number;
    isBirthday?: boolean;
}

export function parseDateFromFilename(filename: string, defaultTime: string = '09:00'): ParsedDateResult | null {
    if (!filename) return null;

    // Quitar extensión y normalizar separadores manteniendo los números y delimitadores
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const now = new Date();
    const currentYear = now.getFullYear();

    let day: number | null = null;
    let month: number | null = null;
    let rawYear: number | null = null;

    // 1. Formato YYYY/MM/DD, YYYY-MM-DD, YYYY_MM_DD, YYYY.MM.DD
    const isoMatch = baseName.match(/(?:^|[^0-9])((?:19|20)\d{2})[/.\-_\s]+(0?[1-9]|1[0-2])[/.\-_\s]+(0?[1-9]|[12]\d|3[01])(?:[^0-9]|$)/);
    if (isoMatch) {
        rawYear = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10);
        day = parseInt(isoMatch[3], 10);
    }

    // 2. Formato DD/MM/YYYY, DD-MM-YYYY, DD_MM_YYYY, DD.MM.YYYY, DD MM YYYY (Año de 4 dígitos 1900-2099)
    if (!day) {
        const dmy4Match = baseName.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])[/.\-_\s]+(0?[1-9]|1[0-2])[/.\-_\s]+((?:19|20)\d{2})(?:[^0-9]|$)/);
        if (dmy4Match) {
            day = parseInt(dmy4Match[1], 10);
            month = parseInt(dmy4Match[2], 10);
            rawYear = parseInt(dmy4Match[3], 10);
        }
    }

    // 3. Formato DD/MM/YY, DD-MM-YY, DD_MM_YY, DD.MM.YY (Año de 2 dígitos)
    if (!day) {
        const dmy2Match = baseName.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])[/.\-_\s]+(0?[1-9]|1[0-2])[/.\-_\s]+(\d{2})(?:[^0-9]|$)/);
        if (dmy2Match) {
            day = parseInt(dmy2Match[1], 10);
            month = parseInt(dmy2Match[2], 10);
            const yy = parseInt(dmy2Match[3], 10);
            rawYear = yy >= 40 ? 1900 + yy : 2000 + yy;
        }
    }

    // 4. Formato DD/MM, DD-MM, DD_MM, DD.MM, DD MM (sin año)
    if (!day) {
        const dmMatch = baseName.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])[/.\-_\s]+(0?[1-9]|1[0-2])(?:[^0-9]|$)/);
        if (dmMatch) {
            day = parseInt(dmMatch[1], 10);
            month = parseInt(dmMatch[2], 10);
        }
    }

    // 5. Formato compacto numérico (DDMMYYYY, DDMMYY o DDMM)
    if (!day) {
        const compactMatch = baseName.match(/(?:^|[^0-9])(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])((?:19|20)\d{2}|\d{2})?(?:[^0-9]|$)/);
        if (compactMatch) {
            day = parseInt(compactMatch[1], 10);
            month = parseInt(compactMatch[2], 10);
            if (compactMatch[3]) {
                const yrStr = compactMatch[3];
                if (yrStr.length === 4) {
                    rawYear = parseInt(yrStr, 10);
                } else if (yrStr.length === 2) {
                    const yy = parseInt(yrStr, 10);
                    rawYear = yy >= 40 ? 1900 + yy : 2000 + yy;
                }
            }
        }
    }

    if (!day || !month) {
        return null;
    }

    // Validar días máximos según mes
    const maxDays = new Date(rawYear || currentYear, month, 0).getDate();
    if (day > maxDays) {
        return null;
    }

    let scheduledYear: number;
    let birthYear: number | undefined;
    let isBirthday: boolean = false;

    if (rawYear !== null && rawYear < currentYear) {
        // Es una fecha de nacimiento / año histórico
        birthYear = rawYear;
        isBirthday = true;

        const birthdayThisYear = new Date(currentYear, month - 1, day, 23, 59, 59);
        if (birthdayThisYear.getTime() < now.getTime()) {
            scheduledYear = currentYear + 1; // Ya pasó este año -> próximo cumpleaños
        } else {
            scheduledYear = currentYear;
        }
    } else if (rawYear !== null && rawYear >= currentYear) {
        // Año explícito futuro o actual
        scheduledYear = rawYear;
    } else {
        // Sin año especificado: asignar próximo día/mes
        const targetThisYear = new Date(currentYear, month - 1, day, 23, 59, 59);
        if (targetThisYear.getTime() < now.getTime()) {
            scheduledYear = currentYear + 1;
        } else {
            scheduledYear = currentYear;
        }
    }

    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const date = `${scheduledYear}-${monthStr}-${dayStr}`;
    const time = `${date}T${defaultTime || '09:00'}`;

    return {
        date,
        time,
        day,
        month,
        year: scheduledYear,
        birthYear,
        isBirthday
    };
}
