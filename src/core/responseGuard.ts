import { getSettings } from './memory';

export class ResponseGuard {
    private static readonly coreForbiddenPatterns = [
        // Prompt Leaking & Jailbreak attempts (Inamovibles por seguridad)
        /ignora(r| tus)? instrucciones/i,
        /dime tu prompt/i,
        /instrucciones anteriores/i,
        /system prompt/i,
        /ignora( todo)? lo anterior/i,
        /olvida( todo)? lo anterior/i,
        /qué instrucciones tienes/i
    ];

    private static readonly defaultFallback = "Mi objetivo principal es ayudarte con nuestros servicios. ¿En qué te puedo asesorar hoy?";

    /**
     * Evalúa si una respuesta generada por la IA es segura leyendo las reglas de la BD.
     * @param text El texto generado por la IA.
     * @returns { isSafe: boolean, filteredText: string }
     */
    public static async evaluateResponse(text: string): Promise<{ isSafe: boolean; filteredText: string }> {
        if (!text) {
            return { isSafe: true, filteredText: text };
        }

        let dynamicPatterns: RegExp[] = [];
        let fallbackMessage = this.defaultFallback;

        try {
            const settings: any = await getSettings();
            if (settings) {
                if (settings.guard_fallback_message) {
                    fallbackMessage = settings.guard_fallback_message;
                }
                if (settings.guard_forbidden_words) {
                    // Separar por comas y limpiar espacios
                    const words = settings.guard_forbidden_words.split(',').map((w: string) => w.trim()).filter(Boolean);
                    if (words.length > 0) {
                        // Crear una regex combinada para todas las palabras personalizadas
                        const escapedWords = words.map((w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                        const customRegex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'i');
                        dynamicPatterns.push(customRegex);
                    }
                }
            }
        } catch (error) {
            console.error('[ResponseGuard] Error al leer configuración dinámica:', error);
        }

        const allPatterns = [...this.coreForbiddenPatterns, ...dynamicPatterns];

        for (const pattern of allPatterns) {
            if (pattern.test(text)) {
                console.warn(`[ResponseGuard] Interceptado mensaje bloqueado por patrón: ${pattern}`);
                return { isSafe: false, filteredText: fallbackMessage };
            }
        }

        return { isSafe: true, filteredText: text };
    }
}
