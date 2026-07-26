import { describe, it, expect, vi } from 'vitest';

// Simulación muy básica del failover de llm
describe('LLM Failover Simulation', () => {
    it('debe saltar al siguiente proveedor si el primero falla', async () => {
        const groqApi = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'));
        const geminiApi = vi.fn().mockResolvedValue('Respuesta desde Gemini');

        async function tryLLM() {
            try {
                return await groqApi();
            } catch (e) {
                return await geminiApi();
            }
        }

        const res = await tryLLM();
        expect(groqApi).toHaveBeenCalled();
        expect(geminiApi).toHaveBeenCalled();
        expect(res).toBe('Respuesta desde Gemini');
    });
});
