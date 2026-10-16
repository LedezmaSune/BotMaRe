import { getSettings } from './memory';

export async function getConfig(key: string, defaultValue: string = ''): Promise<string> {
    let dbSettings: any = {};
    try {
        dbSettings = (await getSettings()) || {};
    } catch (e) {}
    
    // 1. Check Database (Ignorar vacíos para que caiga al .env si no hay valor real)
    if (dbSettings[key] !== undefined && dbSettings[key] !== null && dbSettings[key] !== '') {
        return dbSettings[key];
    }
    
    // 2. Check Process Env
    if (process.env[key] !== undefined) {
        return process.env[key] || defaultValue;
    }
    
    return defaultValue;
}

export async function getAllConfig(): Promise<Record<string, string>> {
    let dbSettings: any = {};
    try {
        dbSettings = (await getSettings()) || {};
    } catch (e) {}
    
    // Common keys we want to expose to the frontend settings page
    const keys = [
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
        'AUTO_DEPLOY'
    ];
    
    const merged: Record<string, string> = { ...dbSettings };
    
    keys.forEach(key => {
        if (!merged[key] && process.env[key]) {
            merged[key] = process.env[key] || '';
        }
    });
    
    return merged;
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

