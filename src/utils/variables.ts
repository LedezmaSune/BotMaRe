import { DateTime } from 'luxon';

export function processVariables(text: string, contactName: string = ''): string {
    if (!text) return text;
    
    let result = text;
    const now = DateTime.now().setZone('America/Mexico_City').setLocale('es');
    
    // Nombres
    const name = contactName.trim() || 'Usuario';
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const replacements: Record<string, string> = {
        '{NOMBRE}': name,
        '{FIRST_NAME}': firstName,
        '{NOMBRE_PILA}': firstName,
        '{APELLIDO}': lastName,
        '{LAST_NAME}': lastName,
        
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

    for (const [variable, value] of Object.entries(replacements)) {
        // Usa una expresión regular global para reemplazar todas las ocurrencias
        const regex = new RegExp(variable, 'gi');
        result = result.replace(regex, value);
    }

    return result;
}
