import { getSettings } from './memory';

export async function getConfig(key: string, defaultValue: string = ''): Promise<string> {
    const dbSettings = await getSettings() as any;
    
    // 1. Check Database
    if (dbSettings[key]) {
        return dbSettings[key];
    }
    
    // 2. Check Process Env
    if (process.env[key]) {
        return process.env[key] || defaultValue;
    }
    
    return defaultValue;
}

export async function getAllConfig(): Promise<Record<string, string>> {
    const dbSettings = await getSettings() as any;
    
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
        'GEMINI_MODEL',
        'OPENAI_MODEL',
        'NVIDIA_MODEL',
        'OPENROUTER_MODEL',
        'DEEPSEEK_MODEL',
        'AI_ENABLED',
        'ENABLE_GROUPS',
        'ALLOWED_GROUPS'
    ];
    
    const merged: Record<string, string> = { ...dbSettings };
    
    keys.forEach(key => {
        if (!merged[key] && process.env[key]) {
            merged[key] = process.env[key] || '';
        }
    });
    
    return merged;
}
