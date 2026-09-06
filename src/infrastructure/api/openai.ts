import OpenAI from "openai";
import { getAllConfig } from "../../core/config";

/**
 * INFRASTRUCTURE LAYER - API
 * Implementación de la comunicación con proveedores de LLM.
 * Soporta failover automático entre Groq, Gemini, OpenAI, etc.
 */

async function tryProvider(providerName: string, keys: string[], config: any, messages: any[], tools: any[] | undefined): Promise<any> {
    for (const key of keys) {
        try {
            const client = new OpenAI({ ...config, apiKey: key });
            const response = await client.chat.completions.create({
                model: config.model,
                messages: messages,
                max_tokens: config.max_tokens || 500,
                ...(tools ? { tools } : {}),
            });
            return response.choices[0]?.message;
        } catch (e) {
            console.warn(`[LLM] ${providerName} falló con una llave.`);
            continue;
        }
    }
    throw new Error(`${providerName} falló.`);
}

export async function callLLM(messages: any[], tools?: any[]): Promise<any> {
    const config = await getAllConfig();
    
    // Intento 1: Groq
    if (config['GROQ_API_KEY']) {
        try {
            return await tryProvider('Groq', [config['GROQ_API_KEY']], {
                baseURL: "https://api.groq.com/openai/v1",
                model: config['GROQ_MODEL'] || "llama-3.3-70b-versatile"
            }, messages, tools);
        } catch (e) {}
    }

    // Intento 2: OpenAI (Default)
    if (config['OPENAI_API_KEY']) {
        return await tryProvider('OpenAI', [config['OPENAI_API_KEY']], {
            model: config['OPENAI_MODEL'] || "gpt-4o-mini"
        }, messages, tools);
    }

    throw new Error("No hay proveedores de IA disponibles.");
}
