import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM } from '../../src/core/llm';
import { invalidateConfigCache } from '../../src/core/config';

// Mock OpenAI client
const mockCreate = vi.fn();

vi.mock('openai', () => {
    return {
        default: class MockOpenAI {
            baseURL?: string;
            apiKey?: string;
            chat: any;
            constructor(config: any) {
                this.baseURL = config?.baseURL;
                this.apiKey = config?.apiKey;
                this.chat = {
                    completions: {
                        create: (payload: any) => ({
                            withResponse: () => mockCreate(config, payload)
                        })
                    }
                };
            }
        }
    };
});

// Mock notification service & telemetry to avoid side effects
vi.mock('../../src/telegram/notification.service', () => ({
    NotificationService: {
        notifyModelEvent: vi.fn()
    }
}));

describe('LLM Failover Integration (Real callLLM module)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        // Clear all LLM keys by default
        delete process.env.GROQ_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.CEREBRAS_API_KEY;
        delete process.env.SAMBANOVA_API_KEY;
        delete process.env.DEEPSEEK_API_KEY;
        delete process.env.OPENROUTER_API_KEY;
        delete process.env.NVIDIA_API_KEY;
        delete process.env.MISTRAL_API_KEY;
        delete process.env.SILICONFLOW_API_KEY;
        delete process.env.TOGETHER_API_KEY;
        delete process.env.CHEAPERINFERENCE_API_KEY;
        delete process.env.OLLAMA_API_URL;
        delete process.env.OLLAMA_API_KEY;
        invalidateConfigCache();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        invalidateConfigCache();
    });

    it('debe saltar al siguiente proveedor si el primero falla (failover Groq -> Gemini)', async () => {
        process.env.GROQ_API_KEY = 'gsk_mock_groq_key';
        process.env.GEMINI_API_KEY = 'gemini_mock_key';
        invalidateConfigCache();

        const callOrder: string[] = [];

        mockCreate.mockImplementation(async (config: any) => {
            const url = config?.baseURL || '';
            if (url.includes('11434')) {
                // Ollama local no disponible
                throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
            }
            if (url.includes('groq.com')) {
                callOrder.push('Groq');
                throw new Error('Rate limit exceeded (429)');
            }
            if (url.includes('generativelanguage.googleapis.com')) {
                callOrder.push('Gemini');
                return {
                    response: {
                        headers: {
                            get: () => null
                        }
                    },
                    data: {
                        choices: [
                            {
                                message: { role: 'assistant', content: 'Respuesta exitosa desde Gemini' }
                            }
                        ],
                        usage: { total_tokens: 35 }
                    }
                };
            }
            throw new Error(`Unexpected provider URL: ${url}`);
        });

        const messages = [{ role: 'user', content: 'Hola, asistente' }];
        const response = await callLLM(messages);

        expect(callOrder).toEqual(['Groq', 'Gemini']);
        expect(response).toBeDefined();
        expect(response.content).toBe('Respuesta exitosa desde Gemini');
    });

    it('debe agregar las causas de fallo de todos los proveedores cuando todos fallan', async () => {
        process.env.GROQ_API_KEY = 'gsk_mock_groq_key';
        process.env.GEMINI_API_KEY = 'gemini_mock_key';
        invalidateConfigCache();

        mockCreate.mockImplementation(async (config: any) => {
            const url = config?.baseURL || '';
            if (url.includes('11434')) {
                throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
            }
            if (url.includes('groq.com')) {
                throw new Error('Groq 429: Rate limit exceeded');
            }
            if (url.includes('generativelanguage.googleapis.com')) {
                throw new Error('Gemini 403: Quota exceeded for project');
            }
            throw new Error('Unknown error');
        });

        const messages = [{ role: 'user', content: 'Mensaje de prueba' }];

        try {
            await callLLM(messages);
            expect.unreachable('callLLM debió lanzar una excepción');
        } catch (error: any) {
            expect(error.message).toContain('No hay proveedores de IA configurados o todos han fallado');
            expect(error.message).toContain('Groq');
            expect(error.message).toContain('Gemini');
            expect(error.causes).toBeDefined();
            expect(Array.isArray(error.causes)).toBe(true);

            const groqCause = error.causes.find((c: any) => c.provider === 'Groq');
            expect(groqCause).toBeDefined();
            expect(groqCause.error).toContain('Rate limit exceeded');

            const geminiCause = error.causes.find((c: any) => c.provider === 'Gemini');
            expect(geminiCause).toBeDefined();
            expect(geminiCause.error).toContain('Quota exceeded');
        }
    });

    it('debe fallar si no hay ningún proveedor configurado', async () => {
        mockCreate.mockImplementation(async () => {
            throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
        });

        await expect(callLLM([{ role: 'user', content: 'Hola' }])).rejects.toThrow(
            'No hay proveedores de IA configurados o todos han fallado'
        );
    });
});
