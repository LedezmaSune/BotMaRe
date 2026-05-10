import { callLLM } from '../../core/llm';
import { getSettings, getHistory, addMessage } from '../../core/memory';

/**
 * MODULE LAYER - AI SERVICES
 * Contiene la lógica de interacción con modelos de lenguaje y orquestación de agentes.
 */
export class AIService {
    
    /**
     * Mejora y corrige un mensaje para marketing/comunicación.
     */
    async reviewMessage(text: string) {
        const prompt = `Eres un experto en comunicación y marketing. Corrige la ortografía y mejora el siguiente texto, agregando emojis apropiados para WhatsApp sin cambiar la intención original. IMPORTANTÍSIMO: Si el texto contiene la etiqueta {nombre} o {{nombre}}, consérvala EXACTAMENTE IGUAL en el lugar donde esté, ya que es una variable de sistema. Solo devuelve el texto corregido, sin explicaciones ni comillas extra:\n\n${text}`;
        const response = await callLLM([{ role: 'user', content: prompt }]);
        return response.content;
    }

    /**
     * Orquestador principal del Agente de IA para conversaciones.
     * Migrado de core/agent.ts para modularidad.
     */
    async runAgent(jid: string, text: string, sender: string, imageBase64?: string) {
        const settings = await getSettings() as any;
        const history = await getHistory(jid);
        
        const basePrompt = settings.system_prompt || 'Eres un asistente útil.';
        const knowledge = settings.possible_responses || '';
        
        const didacticPrompt = `
        NOMBRE DEL BOT: ${settings.bot_name || 'BotMaRe'}
        
        PERSONALIDAD E INSTRUCCIONES:
        ${basePrompt} 
        
        CONOCIMIENTO Y REGLAS (CEREBRO DE DATOS):
        ${knowledge}
        
        REGLAS DE ESTILO CRÍTICAS:
        1. Sé directo y evita el relleno innecesario.
        2. Intenta que tus respuestas no superen los 2 párrafos pequeños.
        3. Mantén un tono amigable, humano y profesional según tu personalidad definida.
        4. No uses introducciones largas, ve directo a la información útil.`;

        const messages = [
            { role: 'system', content: didacticPrompt },
            ...history,
            { role: 'user', content: text }
        ];

        // Si hay una imagen, la añadimos al último mensaje (soporte visión)
        if (imageBase64) {
            const lastMsg = messages[messages.length - 1];
            lastMsg.content = [
                { type: 'text', text: text || '¿Qué ves en esta imagen?' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ] as any;
        }

        const response = await callLLM(messages);
        const replyText = response.content || 'Lo siento, no pude procesar tu mensaje.';

        // Guardar en historial
        await addMessage(jid, 'user', text);
        await addMessage(jid, 'assistant', replyText);

        return replyText;
    }
}
