import path from 'path';
import { UserData } from './interfaces';

/**
 * Configuraciones por defecto canónicas idénticas para todos los motores de base de datos.
 */
export const DEFAULT_BOT_SETTINGS: Record<string, string> = {
    bot_name: "GravityBot",
    system_prompt: "Eres un asistente inteligente y servicial. Responde de forma amable y profesional.",
    possible_responses: "1. Si preguntan precio: Dile que consulte la web.\n2. Si saludan: Saluda cordialmente.",
    AI_ENABLED: "true"
};

/**
 * Valores por defecto de usuario para aplicar al crear un nuevo registro.
 */
export const DEFAULT_USER_DATA: Omit<UserData, 'id'> = {
    nombre: 'Sin Nombre',
    xp: 0,
    nivel: 1,
    rango: 'Novato'
};

/**
 * Aplica los valores por defecto asegurando que valores undefined o vacíos no borren los defaults.
 */
export function applyUserDefaults(id: string, data: Partial<UserData> = {}): UserData {
    return {
        id,
        nombre: (data.nombre !== undefined && data.nombre !== null && String(data.nombre).trim() !== '')
            ? String(data.nombre).trim()
            : DEFAULT_USER_DATA.nombre,
        xp: (data.xp !== undefined && data.xp !== null && !isNaN(Number(data.xp)))
            ? Number(data.xp)
            : DEFAULT_USER_DATA.xp,
        nivel: (data.nivel !== undefined && data.nivel !== null && !isNaN(Number(data.nivel)))
            ? Number(data.nivel)
            : DEFAULT_USER_DATA.nivel,
        rango: (data.rango !== undefined && data.rango !== null && String(data.rango).trim() !== '')
            ? String(data.rango).trim()
            : DEFAULT_USER_DATA.rango
    };
}

/**
 * Combina un usuario existente con datos parciales, ignorando campos undefined.
 */
export function mergeUserData(existing: UserData, update: Partial<UserData>): UserData {
    const cleanUpdate: Partial<UserData> = {};
    if (update.nombre !== undefined && update.nombre !== null) cleanUpdate.nombre = String(update.nombre).trim();
    if (update.xp !== undefined && update.xp !== null && !isNaN(Number(update.xp))) cleanUpdate.xp = Number(update.xp);
    if (update.nivel !== undefined && update.nivel !== null && !isNaN(Number(update.nivel))) cleanUpdate.nivel = Number(update.nivel);
    if (update.rango !== undefined && update.rango !== null) cleanUpdate.rango = String(update.rango).trim();

    return {
        ...existing,
        ...cleanUpdate
    };
}

/**
 * Normaliza una ruta multimedia a su basename canónico en minúsculas.
 */
export function normalizeMediaBasename(mediaPath?: string | null): string {
    if (!mediaPath || typeof mediaPath !== 'string') return '';
    return path.basename(mediaPath.trim()).toLowerCase();
}
