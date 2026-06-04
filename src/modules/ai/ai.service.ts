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
    async reviewMessage(text: string, mode: 'standard' | 'spintax' = 'standard') {
        let prompt = '';
        if (mode === 'spintax') {
            prompt = `Eres un redactor experto para campañas de WhatsApp. Se te dará un mensaje que contiene etiquetas del sistema (como {NOMBRE}, {FECHA}, {SALUDO}, etc.) y otras frases personalizadas marcadas entre llaves (como {esta frase}) que el usuario desea que varíes para aplicar Spintax.

Tu única tarea es:
1. Identificar las frases encerradas entre llaves { } que NO correspondan a variables predefinidas del sistema.
Las variables del sistema que NO debes alterar de ninguna manera son: {NOMBRE}, {FIRST_NAME}, {NOMBRE_PILA}, {APELLIDO}, {LAST_NAME}, {SALUDO}, {EMOJI_SALUDO}, {EMOJI_ATENCION}, {EMOJI_ALEATORIO}, {HORA_12}, {HORA_24}, {DIA_SEMANA}, {DAY_OF_WEEK}, {DIA_MES}, {MES}, {MONTH}, {ANO}, {YEAR}, {FECHA}, {DATE}, {NUMERO_ALEATORIO}, {UBICACION_LAT_LNG}, {UBICACION_DIRECCION}.
2. Para cualquier otra frase encerrada entre llaves (ej: "{un descuento del 10%}" o "{nuestro evento}"), debes reemplazarla por un bloque de Spintax en el formato {opción1|opción2|opción3} donde la opción 1 sea exactamente la frase original, y las opciones 2 y 3 sean formas alternativas de decir lo mismo (sinónimos o giros lingüísticos de longitud similar) acompañadas de emojis temáticos altamente representativos (por ejemplo: si el tema es financiero usa 📈, 💵, 💰; si es de salud usa 🏥, 🩺, 💊; si es comercial usa 🚀, 🛍️, 🎁, etc.).
3. El resto del texto que está fuera de las llaves, así como las variables predefinidas del sistema, deben permanecer EXACTAMENTE igual, sin cambiar una sola letra, puntuación, mayúsculas/minúsculas o espacio.
4. Solo responde con el mensaje procesado final en formato Spintax listo para usar. No agregues introducciones, explicaciones ni comillas adicionales alrededor del texto.

Texto a procesar:
${text}`;
        } else {
            prompt = `Eres un experto en comunicación y marketing. Corrige la ortografía y mejora el siguiente texto, analizando el tema principal y agregando emojis altamente representativos de esa temática para WhatsApp (ej: si es financiero usa 📈, 💵, 💰; si es de salud usa 🏥, 🩺, 💊; si es comercial/saludo usa 👋, 🛍️, 🚀, etc.) de forma natural, sin cambiar la intención original. IMPORTANTÍSIMO: Si el texto contiene etiquetas de variables como {NOMBRE}, {FIRST_NAME}, {DIA_SEMANA}, etc., consérvalas EXACTAMENTE IGUAL en el lugar donde estén. Solo devuelve el texto corregido, sin explicaciones ni comillas extra:\n\n${text}`;
        }
        
        const response = await callLLM([{ role: 'user', content: prompt }]);
        return response.content;
    }

    /**
     * Orquestador principal del Agente de IA para conversaciones.
     * Migrado de core/agent.ts para modularidad.
     */
    async runAgent(jid: string, text: string, sender: string, imageBase64?: string) {
        const settings = await getSettings() as any;
        const history = await getHistory(jid, 1); // Limitado a 1 mensaje para ahorrar tokens
        
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
