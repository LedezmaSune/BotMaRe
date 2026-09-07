import OpenAI from "openai";
import { getAllConfig } from "./config";
import { telemetry } from "./telemetry";
import { NotificationService } from "../telegram/notification.service";

/**
 * Parsea una cadena de texto con llaves separadas por coma y devuelve un array limpio.
 */
function getApiKeys(envValue: string | undefined): string[] {
    if (!envValue) return [];
    return envValue.split(',').map(k => k.trim().replace(/^["']|["']$/g, ''));
}

const LLM_TIMEOUT_MS = 15000;        // 15s para la mayoría de proveedores
const LLM_TIMEOUT_NVIDIA_MS = 8000;  // Aumentamos a 8s para NVIDIA/DeepSeek

/**
 * Intenta realizar una petición a un proveedor específico recorriendo sus llaves.
 */
async function tryProvider(
    providerName: string,
    keys: string[],
    config: any,
    messages: any[],
    tools: any[] | undefined,
    hasVision: boolean
): Promise<any> {
    for (const key of keys) {
        try {
            const client = new OpenAI({ ...config, apiKey: key });
            const payload: any = {
                model: config.model,
                messages: messages,
                max_tokens: config.max_tokens || 400,
                ...(tools && tools.length > 0 && !(hasVision && providerName === 'Groq') ? { tools } : {}),
            };
            
            if (config.extraBody) payload.extra_body = config.extraBody;
            if (config.temperature !== undefined) payload.temperature = config.temperature;
            if (config.top_p !== undefined) payload.top_p = config.top_p;

            const timeout = providerName === 'Nvidia' ? LLM_TIMEOUT_NVIDIA_MS : LLM_TIMEOUT_MS;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
            );

            const startMs = Date.now();
            const responseWithHeaders = await Promise.race([
                client.chat.completions.create(payload).withResponse(),
                timeoutPromise
            ]) as any;
            const latencyMs = Date.now() - startMs;

            const remainingTokens = responseWithHeaders.response.headers.get('x-ratelimit-remaining-tokens');
            if (remainingTokens) {
                const logMsg = `[LLM] ${providerName} - Tokens restantes (Límite Diario): ${remainingTokens}`;
                console.log(logMsg);
                // Notificar si quedan pocos tokens (ej. menos de 1000)
                if (parseInt(remainingTokens) < 1000) {
                    NotificationService.notifyModelEvent(providerName, config.model, 'warning', `Límite diario bajo: ${remainingTokens} tokens restantes.`);
                }
            }

            const usage = responseWithHeaders.data.usage;
            const totalTokens = usage ? usage.total_tokens : 0;
            telemetry.recordLLMRequest(providerName, totalTokens, latencyMs);

            console.log(`[LLM] ${providerName} (${config.model}) Respondió con éxito. Tokens: ${totalTokens}, Latencia: ${latencyMs}ms`);
            NotificationService.notifyModelEvent(providerName, config.model, 'success');
            return responseWithHeaders.data.choices[0]?.message;
        } catch (error: any) {
            let errorMsg = error.message || String(error);
            
            // Inyectar sugerencias inteligentes según el tipo de error
            if (error.status === 404 || errorMsg.includes('404')) {
                errorMsg += `\n    💡 SUGERENCIA: El modelo '${config.model}' ya no existe o está mal escrito. Busca el modelo más nuevo y actualiza el archivo .env`;
            } else if (error.status === 429 || errorMsg.includes('429')) {
                errorMsg += `\n    💡 SUGERENCIA: Te quedaste sin tokens diarios en esta cuenta. Añade una nueva API Key de un correo DIFERENTE en el .env`;
            } else if (error.status === 402 || errorMsg.includes('Insufficient Balance')) {
                errorMsg += `\n    💡 SUGERENCIA: Tu cuenta no tiene saldo suficiente o requiere recarga.`;
            }

            console.warn(`[LLM] ${providerName} falló con una llave: ${errorMsg}`);
            NotificationService.notifyModelEvent(providerName, config.model, 'fail', errorMsg);
            continue; // Intentar con la siguiente llave del mismo proveedor
        }
    }
    throw new Error(`Todas las llaves de ${providerName} fallaron o agotaron el tiempo.`);
}

/**
 * Limpia y estandariza los mensajes para los proveedores.
 */
function cleanMessages(messages: any[]): any[] {
    return messages.map((msg: any) => {
        let content = msg.content;
        
        if (Array.isArray(content)) {
            const hasText = content.some((c: any) => c.type === 'text');
            if (!hasText) {
                content = [...content, { type: 'text', text: 'Imagen adjunta' }];
            }
        } else if (!content && msg.role !== 'assistant') {
            content = " "; 
        }

        return {
            role: msg.role,
            content: content,
            ...(msg.name && { name: msg.name }),
            ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
            ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        };
    });
}

/**
 * Orquestador principal de LLM con Failover automático.
 */
export async function callLLM(
    messages: any[],
    tools?: any[]
): Promise<any> {
    const cleanedMessages = cleanMessages(messages);
    const hasVision = messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url'));
    
    // Obtener TODA la configuración de una vez (Optimización)
    const config = await getAllConfig();

    // 1. Intentar Groq (Opción 1 - Velocidad y Herramientas)
    const groqKeys = getApiKeys(config['GROQ_API_KEY']);
    if (groqKeys.length > 0) {
        try {
            return await tryProvider('Groq', groqKeys, {
                baseURL: "https://api.groq.com/openai/v1",
                model: hasVision ? "llama-3.2-11b-vision-instant" : (config['GROQ_MODEL'] || "llama-3.3-70b-versatile")
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 1.1 Intentar Cerebras (Ultrarrápido Gratis - Llama 3.1 70B)
    const cerebrasKeys = getApiKeys(config['CEREBRAS_API_KEY']);
    if (cerebrasKeys.length > 0 && !hasVision) {
        try {
            return await tryProvider('Cerebras', cerebrasKeys, {
                baseURL: "https://api.cerebras.ai/v1",
                model: config['CEREBRAS_MODEL'] || "llama3.1-70b"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 1.2 Intentar SambaNova (Llama 3.3 70B Gratis)
    const sambanovaKeys = getApiKeys(config['SAMBANOVA_API_KEY']);
    if (sambanovaKeys.length > 0 && !hasVision) {
        try {
            return await tryProvider('SambaNova', sambanovaKeys, {
                baseURL: "https://api.sambanova.ai/v1",
                model: config['SAMBANOVA_MODEL'] || "Meta-Llama-3.3-70B-Instruct"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 1.5. Intentar DeepSeek Directo (Opción 2 - Inteligencia Pura)
    const dsKeys = getApiKeys(config['DEEPSEEK_API_KEY']);
    if (dsKeys.length > 0 && !hasVision) {
        try {
            return await tryProvider('DeepSeek', dsKeys, {
                baseURL: "https://api.deepseek.com",
                model: config['DEEPSEEK_MODEL'] || "deepseek-chat"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 2. Intentar Gemini
    const geminiKeys = getApiKeys(config['GEMINI_API_KEY']);
    if (geminiKeys.length > 0) {
        try {
            return await tryProvider('Gemini', geminiKeys, {
                baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
                model: config['GEMINI_MODEL'] || "gemini-2.5-flash"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 3. Intentar OpenAI
    const openaiKeys = getApiKeys(config['OPENAI_API_KEY']);
    if (openaiKeys.length > 0) {
        try {
            return await tryProvider('OpenAI', openaiKeys, {
                model: config['OPENAI_MODEL'] || "gpt-4o-mini"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 4. Intentar OpenRouter
    const orKeys = getApiKeys(config['OPENROUTER_API_KEY']);
    if (orKeys.length > 0) {
        try {
            return await tryProvider('OpenRouter', orKeys, {
                baseURL: "https://openrouter.ai/api/v1",
                model: config['OPENROUTER_MODEL'] || "meta-llama/llama-3.3-70b-instruct:free",
                defaultHeaders: {
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "BotMaRe AI",
                }
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 5. Intentar Nvidia (DeepSeek)
    const nvidiaKeys = getApiKeys(config['NVIDIA_API_KEY']);
    if (nvidiaKeys.length > 0) {
        try {
            return await tryProvider('Nvidia', nvidiaKeys, {
                baseURL: "https://integrate.api.nvidia.com/v1",
                model: config['NVIDIA_MODEL'] || "deepseek-ai/deepseek-v4-pro",
                max_tokens: 4000,
                temperature: 1,
                top_p: 0.95,
                extraBody: { chat_template_kwargs: { thinking: false } }
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 6. Intentar Mistral AI
    const mistralKeys = getApiKeys(config['MISTRAL_API_KEY']);
    if (mistralKeys.length > 0) {
        try {
            return await tryProvider('Mistral', mistralKeys, {
                baseURL: "https://api.mistral.ai/v1",
                model: config['MISTRAL_MODEL'] || "mistral-small-latest"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 7. Intentar SiliconFlow (DeepSeek V3/R1 Gratis)
    const sfKeys = getApiKeys(config['SILICONFLOW_API_KEY']);
    if (sfKeys.length > 0) {
        try {
            return await tryProvider('SiliconFlow', sfKeys, {
                baseURL: "https://api.siliconflow.cn/v1",
                model: config['SILICONFLOW_MODEL'] || "deepseek-ai/DeepSeek-V3"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    // 8. Intentar Together AI
    const togetherKeys = getApiKeys(config['TOGETHER_API_KEY']);
    if (togetherKeys.length > 0) {
        try {
            return await tryProvider('Together', togetherKeys, {
                baseURL: "https://api.together.xyz/v1",
                model: config['TOGETHER_MODEL'] || "meta-llama/Llama-3.3-70B-Instruct-Turbo"
            }, cleanedMessages, tools, hasVision);
        } catch (e) {}
    }

    throw new Error("No hay proveedores de IA configurados o todos han fallado.");
}

/**
 * Transcripción de Audio usando Whisper de Groq
 */
export async function transcribeAudio(audioBuffer: Buffer) {
    const config = await getAllConfig();
    const groqKeys = getApiKeys(config['GROQ_API_KEY']);
    
    if (groqKeys.length === 0) throw new Error("Se requiere una API Key de Groq para la transcripción.");
    
    try {
        const client = new OpenAI({ apiKey: groqKeys[0], baseURL: "https://api.groq.com/openai/v1" });
        const response = await client.audio.transcriptions.create({
            file: await OpenAI.toFile(audioBuffer, "voice.ogg"),
            model: "whisper-large-v3",
        });
        return response.text;
    } catch (error: any) {
        console.error("Error en transcripción:", error.message);
        throw error;
    }
}
