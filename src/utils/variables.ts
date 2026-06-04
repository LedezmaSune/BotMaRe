import { DateTime } from 'luxon';

const GREETING_EMOJIS = ['👋', '😊', '🤝', '🙌', '✨', '🌟'];
const ATTENTION_EMOJIS = ['💡', '📢', '🔔', '📌', '⚠️', '🎯'];
const RANDOM_EMOJIS = ['😊', '👍', '🎉', '🚀', '🔥', '✅', '✨', '⭐', '😎', '👋', '💡', '📌'];

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function processVariables(text: string, contactName: string = ''): string {
    if (!text) return text;
    
    let result = text;
    const now = DateTime.now().setZone('America/Mexico_City').setLocale('es');
    
    // Nombres
    const name = contactName.trim() || 'Usuario';
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Saludo dinámico según la hora
    let greeting = 'Hola';
    const hour = now.hour;
    if (hour >= 6 && hour < 12) {
        greeting = 'Buenos días';
    } else if (hour >= 12 && hour < 19) {
        greeting = 'Buenas tardes';
    } else {
        greeting = 'Buenas noches';
    }

    const replacements: Record<string, string> = {
        '{NOMBRE}': name,
        '{FIRST_NAME}': firstName,
        '{NOMBRE_PILA}': firstName,
        '{APELLIDO}': lastName,
        '{LAST_NAME}': lastName,
        
        // Saludos y Emojis Dinámicos
        '{SALUDO}': greeting,
        '{EMOJI_SALUDO}': getRandomElement(GREETING_EMOJIS),
        '{EMOJI_ATENCION}': getRandomElement(ATTENTION_EMOJIS),
        '{EMOJI_ALEATORIO}': getRandomElement(RANDOM_EMOJIS),
        
        // Tiempo
        '{HORA_12}': now.toFormat('hh:mm a'),
        '{HORA_24}': now.toFormat('HH:mm'),
        
        // Días
        '{DIA_SEMANA}': now.toFormat('EEEE'),
        '{DAY_OF_WEEK}': now.toFormat('EEEE'),
        '{DIA_SEMANA_MANANA}': now.plus({ days: 1 }).toFormat('EEEE'),
        '{DIA_MES}': now.toFormat('dd'),
        '{DAY_OF_MONTH}': now.toFormat('dd'),
        
        // Meses
        '{MES}': now.toFormat('LLLL'),
        '{MONTH}': now.toFormat('LLLL'),
        '{PROXIMO_MES}': now.plus({ months: 1 }).toFormat('LLLL'),
        '{MES_ANTERIOR}': now.minus({ months: 1 }).toFormat('LLLL'),
        
        // Años
        '{ANO}': now.toFormat('yyyy'),
        '{YEAR}': now.toFormat('yyyy'),
        '{PROXIMO_ANO}': now.plus({ years: 1 }).toFormat('yyyy'),
        '{ANO_ANTERIOR}': now.minus({ years: 1 }).toFormat('yyyy'),
        
        // Fechas
        '{FECHA}': now.toFormat('dd/MM/yyyy'),
        '{DATE}': now.toFormat('dd/MM/yyyy'),
        '{FECHA_MANANA}': now.plus({ days: 1 }).toFormat('dd/MM/yyyy'),
        '{FECHA_PASADO_MANANA}': now.plus({ days: 2 }).toFormat('dd/MM/yyyy'),
        
        // Otros
        '{NUMERO_ALEATORIO}': Math.floor(Math.random() * 1000000).toString(),
        
        // Ubicación (Mock)
        '{UBICACION_LAT_LNG}': 'No disponible',
        '{UBICACION_DIRECCION}': 'No disponible'
    };

    // 1. Reemplazar variables exactas predefinidas
    for (const [variable, value] of Object.entries(replacements)) {
        const regex = new RegExp(variable, 'gi');
        result = result.replace(regex, value);
    }

    // 2. Procesar Spintax (Giro de texto / Emojis)
    // Patrón para capturar {opcion1|opcion2|...} asegurando que tenga al menos un pipe
    const spintaxPattern = /\{([^{}|]+(?:\|[^{}|]*)+)\}/g;
    let matchesFound = true;
    let iterations = 0;
    
    while (matchesFound && iterations < 10) {
        const previousResult = result;
        result = result.replace(spintaxPattern, (match, choicesStr) => {
            const choices = choicesStr.split('|');
            const randomChoice = choices[Math.floor(Math.random() * choices.length)];
            return randomChoice;
        });
        matchesFound = result !== previousResult;
        iterations++;
    }

    return result;
}
