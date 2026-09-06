import { getSettings } from './memory';

export async function getConfig(key: string, defaultValue: string = ''): Promise<string> {
    let dbSettings: any = {};
    try {
        dbSettings = (await getSettings()) || {};
    } catch (e) {}
    
    // 1. Check Database (usar !== undefined para permitir strings vacíos "")
    if (dbSettings[key] !== undefined) {
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
