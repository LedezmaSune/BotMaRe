import OpenAI from 'openai';
import { getAllConfig } from './config';

function cleanKeys(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(k => k.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

export interface DiagnosticResult {
    provider: string;
    model: string;
    keyMasked: string;
    success: boolean;
    latencyMs: number;
    reply?: string;
    error?: string;
}

const PROVIDERS = [
    {
        name: 'Groq',
        envKey: 'GROQ_API_KEY',
        modelEnvKey: 'GROQ_MODEL',
        defaultModel: 'llama-3.3-70b-versatile',
        baseURL: 'https://api.groq.com/openai/v1',
    },
    {
        name: 'Cerebras',
        envKey: 'CEREBRAS_API_KEY',
        modelEnvKey: 'CEREBRAS_MODEL',
        defaultModel: 'llama3.1-70b',
        baseURL: 'https://api.cerebras.ai/v1',
    },
    {
        name: 'SambaNova',
        envKey: 'SAMBANOVA_API_KEY',
        modelEnvKey: 'SAMBANOVA_MODEL',
        defaultModel: 'Meta-Llama-3.3-70B-Instruct',
        baseURL: 'https://api.sambanova.ai/v1',
    },
    {
        name: 'DeepSeek',
        envKey: 'DEEPSEEK_API_KEY',
        modelEnvKey: 'DEEPSEEK_MODEL',
        defaultModel: 'deepseek-chat',
        baseURL: 'https://api.deepseek.com',
    },
    {
        name: 'Gemini',
        envKey: 'GEMINI_API_KEY',
        modelEnvKey: 'GEMINI_MODEL',
        defaultModel: 'gemini-2.5-flash',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    },
    {
        name: 'OpenAI',
        envKey: 'OPENAI_API_KEY',
        modelEnvKey: 'OPENAI_MODEL',
        defaultModel: 'gpt-4o-mini',
    },
    {
        name: 'OpenRouter',
        envKey: 'OPENROUTER_API_KEY',
        modelEnvKey: 'OPENROUTER_MODEL',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
        baseURL: 'https://openrouter.ai/api/v1',
    },
    {
        name: 'Nvidia',
        envKey: 'NVIDIA_API_KEY',
        modelEnvKey: 'NVIDIA_MODEL',
        defaultModel: 'deepseek-ai/deepseek-v4-pro',
        baseURL: 'https://integrate.api.nvidia.com/v1',
    },
    {
        name: 'Mistral',
        envKey: 'MISTRAL_API_KEY',
        modelEnvKey: 'MISTRAL_MODEL',
        defaultModel: 'mistral-small-latest',
        baseURL: 'https://api.mistral.ai/v1',
    },
    {
        name: 'SiliconFlow',
        envKey: 'SILICONFLOW_API_KEY',
        modelEnvKey: 'SILICONFLOW_MODEL',
        defaultModel: 'deepseek-ai/DeepSeek-V3',
        baseURL: 'https://api.siliconflow.cn/v1',
    },
    {
        name: 'Together',
        envKey: 'TOGETHER_API_KEY',
        modelEnvKey: 'TOGETHER_MODEL',
        defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        baseURL: 'https://api.together.xyz/v1',
    },
];

export async function runLLMDiagnostic(): Promise<{ results: DiagnosticResult[]; summary: string; textReport: string }> {
    const config = await getAllConfig();
    const results: DiagnosticResult[] = [];
    let totalTested = 0;
    let totalWorking = 0;

    let textReport = "🤖 *Diagnóstico de Modelos e IA (BotMaRe)*\n\n";

    for (const p of PROVIDERS) {
        const keys = cleanKeys(config[p.envKey] || process.env[p.envKey]);
        const model = (p.modelEnvKey && config[p.modelEnvKey]) || p.defaultModel;

        if (keys.length === 0) {
            textReport += `⚪ *${p.name}:* Sin llaves configuradas\n`;
            continue;
        }

        textReport += `🔍 *${p.name}* \`(${model})\` - ${keys.length} llave(s):\n`;

        for (let i = 0; i < keys.length; i++) {
            totalTested++;
            const key = keys[i];
            const maskedKey = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '****';
            const client = new OpenAI({ apiKey: key, baseURL: p.baseURL });

            const start = Date.now();
            try {
                const res = await client.chat.completions.create({
                    model: model,
                    messages: [{ role: 'user', content: 'Responde OK' }],
                    max_tokens: 5,
                });
                const latencyMs = Date.now() - start;
                const reply = res.choices[0]?.message?.content?.trim() || 'OK';
                
                results.push({
                    provider: p.name,
                    model: model,
                    keyMasked: maskedKey,
                    success: true,
                    latencyMs,
                    reply
                });
                totalWorking++;
                textReport += `  🟢 [Llave ${i + 1}] (${maskedKey}): *OK* (${latencyMs}ms)\n`;
            } catch (err: any) {
                const latencyMs = Date.now() - start;
                const status = err.status ? `[HTTP ${err.status}] ` : '';
                const msg = err.message ? err.message.split('\n')[0] : String(err);
                
                results.push({
                    provider: p.name,
                    model: model,
                    keyMasked: maskedKey,
                    success: false,
                    latencyMs,
                    error: `${status}${msg}`
                });
                textReport += `  🔴 [Llave ${i + 1}] (${maskedKey}): ${status}_${msg.substring(0, 50)}..._\n`;
            }
        }
        textReport += `\n`;
    }

    const summary = `📊 *Resumen:* ${totalWorking}/${totalTested} llaves operativas.`;
    textReport += `------------------------------\n${summary}`;

    return { results, summary, textReport };
}
