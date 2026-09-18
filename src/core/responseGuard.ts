export class ResponseGuard {
    private static readonly forbiddenPatterns = [
        // Prompt Leaking & Jailbreak attempts
        /ignora(r| tus)? instrucciones/i,
        /dime tu prompt/i,
        /instrucciones anteriores/i,
        /system prompt/i,
        /ignora( todo)? lo anterior/i,
        /olvida( todo)? lo anterior/i,
        /qué instrucciones tienes/i,
        
        // Toxicidad y groserías (Básico)
        // Puedes agregar más palabras específicas aquí
        /\b(idiota|imbecil|estupido|pendejo)\b/i
    ];

    private static readonly defaultFallback = "Mi objetivo principal es ayudarte con nuestros servicios. ¿En qué te puedo asesorar hoy?";

    /**
     * Evalúa si una respuesta generada por la IA es segura.
     * @param text El texto generado por la IA.
     * @returns { isSafe: boolean, filteredText: string }
     */
    public static evaluateResponse(text: string): { isSafe: boolean; filteredText: string } {
        if (!text) {
            return { isSafe: true, filteredText: text };
        }

        for (const pattern of this.forbiddenPatterns) {
            if (pattern.test(text)) {
                console.warn(`[ResponseGuard] Interceptado mensaje bloqueado por patrón: ${pattern}`);
                return { isSafe: false, filteredText: this.defaultFallback };
            }
        }

        return { isSafe: true, filteredText: text };
    }
}
