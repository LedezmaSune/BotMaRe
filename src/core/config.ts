/**
 * PRECEDENCIA UNIFICADA DE CONFIGURACIÓN DE BOTMARE:
 * 1. Base de Datos (BD / Dashboard / setConfig / updateSettings) - Máxima prioridad.
 *    Cualquier valor no vacío almacenado en la base de datos sobrescribe los valores de entorno.
 * 2. Variables de Entorno (process.env / .env) - Prioridad media.
 *    Definen la configuración de arranque o infraestructura si la clave no tiene valor explícito en BD.
 * 3. Valores por Defecto (Defaults de código) - Prioridad base.
 *    Garantizan un comportamiento funcional si la clave no está presente ni en BD ni en process.env.
 *
 * CACHÉ E INMUTABILIDAD:
 * Todas las consultas son cacheadas por 5 minutos (300.000 ms) en MemoryCache.
 * MemoryCache devuelve clones profundos (structuredClone) para prevenir que mutaciones
 * externas contaminen el estado en caché. Al invocar setConfig() o updateSettings(),
 * las claves 'settings' y 'all_config' se invalidan inmediatamente.
 */

import { getSettings, updateSettings } from './dbManager';
import { cacheManager } from '../utils/cache';

export const KNOWN_CONFIG_KEYS = [
    'bot_name',
    'system_prompt',
    'possible_responses',
    'guard_fallback_message',
    'guard_forbidden_words',
    'CURRENT_PLAN',
    'ENABLED_MODULES',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'NVIDIA_API_KEY',
    'OPENROUTER_API_KEY',
    'DEEPSEEK_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ALLOWED_USER_IDS',
    'DASHBOARD_USER',
    'DASHBOARD_PASS',
    'PORT',
    'GROQ_MODEL',
    'CEREBRAS_API_KEY',
    'CEREBRAS_MODEL',
    'SAMBANOVA_API_KEY',
    'SAMBANOVA_MODEL',
    'MISTRAL_API_KEY',
    'MISTRAL_MODEL',
    'SILICONFLOW_API_KEY',
    'SILICONFLOW_MODEL',
    'TOGETHER_API_KEY',
    'TOGETHER_MODEL',
    'GEMINI_MODEL',
    'OPENAI_MODEL',
    'NVIDIA_MODEL',
    'OPENROUTER_MODEL',
    'DEEPSEEK_MODEL',
    'AI_ENABLED',
    'AUTORESPONDERS_ENABLED',
    'ENABLE_GROUPS',
    'ALLOWED_GROUPS',
    'NOTIFY_MODELS_TELEGRAM',
    'HTTPSMS_API_KEY',
    'HTTPSMS_FROM_NUMBER',
    'HTTPSMS_API_URL',
    'CHEAPERINFERENCE_API_KEY',
    'CHEAPERINFERENCE_MODEL',
    'OLLAMA_API_URL',
    'OLLAMA_MODEL',
    'OLLAMA_API_KEY',
    'AUTO_DEPLOY',
    'SUPERADMIN_KEY',
    'BACKUP_ENCRYPTION_KEY',
    'WEBHOOK_API_KEY',
    'GITHUB_WEBHOOK_SECRET',
    'GITHUB_TOKEN',
    'MONGO_URI',
    'DB_ENGINE',
    'WHATSAPP_OWNER_NUMBER'
];

/**
 * Obtiene un valor de configuración individual siguiendo la precedencia BD > process.env > defaultValue.
 */
export async function getConfig(key: string, defaultValue: string = ''): Promise<string> {
    const all = await getAllConfig();
    const val = all[key];
    if (val !== undefined && val !== null && val !== '') {
        return String(val);
    }
    if (process.env[key] !== undefined && process.env[key] !== '') {
        return process.env[key]!;
    }
    return defaultValue;
}

/**
 * Retorna el mapa completo de configuración resuelto (BD > process.env > defaults),
 * aprovechando la caché unificada para alto rendimiento (ej. en cada llamada a LLM).
 */
export async function getAllConfig(): Promise<Record<string, string>> {
    const cached = cacheManager.get<Record<string, string>>('all_config');
    if (cached) return cached;

    let dbSettings: Record<string, string> = {};
    try {
        dbSettings = (await getSettings()) || {};
    } catch {
        dbSettings = {};
    }

    const merged: Record<string, string> = { ...dbSettings };

    for (const key of KNOWN_CONFIG_KEYS) {
        if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
            if (process.env[key] !== undefined && process.env[key] !== '') {
                merged[key] = process.env[key]!;
            } else if (merged[key] === undefined || merged[key] === null) {
                merged[key] = '';
            }
        }
    }

    cacheManager.set('all_config', merged, 300000);
    return merged;
}

/**
 * Actualiza un parámetro de configuración en la persistencia e invalida la caché de configuración.
 */
export async function setConfig(key: string, value: string): Promise<Record<string, string>> {
    await updateSettings({ [key]: value });
    invalidateConfigCache();
    return getAllConfig();
}

/**
 * Invalida manualmente las entradas de caché de configuración ('settings' y 'all_config').
 */
export function invalidateConfigCache(): void {
    cacheManager.del('settings');
    cacheManager.del('all_config');
}

// Claves sensibles que nunca deben ser expuestas en texto claro al frontend
export const SENSITIVE_KEYS = new Set([
    'DASHBOARD_PASS',
    'SUPERADMIN_KEY',
    'BACKUP_ENCRYPTION_KEY',
    'GITHUB_TOKEN',
    'GITHUB_WEBHOOK_SECRET',
    'WEBHOOK_API_KEY',
    'MONGO_URI',
    'TELEGRAM_BOT_TOKEN',
    'HTTPSMS_API_KEY',
    'CHEAPERINFERENCE_API_KEY',
    'OLLAMA_API_KEY',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'NVIDIA_API_KEY',
    'OPENROUTER_API_KEY',
    'DEEPSEEK_API_KEY',
    'CEREBRAS_API_KEY',
    'SAMBANOVA_API_KEY',
    'MISTRAL_API_KEY',
    'SILICONFLOW_API_KEY',
    'TOGETHER_API_KEY'
]);

/**
 * Determina si una clave dada es sensible y requiere enmascaramiento
 */
export function isSensitiveKey(key: string): boolean {
    const upper = key.toUpperCase();
    if (SENSITIVE_KEYS.has(upper)) return true;
    if (upper.endsWith('_API_KEY')) return true;
    if (upper.endsWith('_TOKEN')) return true;
    if (upper.endsWith('_SECRET')) return true;
    if (upper.includes('PASS')) return true;
    return false;
}

/**
 * Enmascara un secreto mostrando solo una máscara y los últimos 4 caracteres (ej. ••••1234)
 */
export function maskSecret(val?: string): string {
    if (!val) return '';
    if (val.length <= 4) return '••••';
    return '••••' + val.slice(-4);
}

/**
 * Retorna la configuración segura para ser entregada al cliente HTTP (Dashboard),
 * con todos los secretos enmascarados.
 */
export async function getSafePublicConfig(): Promise<Record<string, string>> {
    const raw = await getAllConfig();
    const masked: Record<string, string> = {};

    for (const [key, val] of Object.entries(raw)) {
        if (isSensitiveKey(key)) {
            masked[key] = maskSecret(val);
        } else {
            masked[key] = val;
        }
    }

    return masked;
}
