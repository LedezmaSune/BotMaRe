import { Context, InputFile } from "grammy";
import { runAgent } from "../../core/agent";
import { transcribeAudio } from "../../core/llm";
import { textToSpeech } from "../../core/voice";
import axios from "axios";
import { bot } from "../bot";

export async function handleTelegramVoice(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.replyWithChatAction("typing");

  try {
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // Download audio
    const responseAudio = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(responseAudio.data as ArrayBuffer);

    // Transcribe
    const text = await transcribeAudio(buffer);
    console.log(`[Audio Transcribed] ${userId}: ${text}`);

    // Send transcription back to user (optional but helpful)
    await ctx.reply(`📝 _"${text}"_`, { parse_mode: "Markdown" });

    // Process with Agent
    await ctx.replyWithChatAction("typing");
    
    // Inyectamos contexto para que el agente sepa que está hablando con el Admin en Telegram
    const adminContext = `\n\n[SISTEMA: Estás hablando con el Administrador principal desde el bot de Telegram. Tienes permisos totales (fullAccess). Si la instrucción en el audio te pide agendar un recordatorio, modificar listas o realizar alguna acción técnica, asume que es una orden directa y usa tus herramientas (tools) inmediatamente para ejecutarla. Confírmale al administrador de forma breve y concisa que la tarea fue realizada.]`;
    
    const agentResponse = await runAgent(userId, text + adminContext, userId, undefined, true);
    const needsVoice = /voz|audio|habla|dímelo|escuchar/i.test(text);

    if (needsVoice) {
      const voiceBuffer = await textToSpeech(agentResponse);
      if (voiceBuffer) {
        await ctx.replyWithChatAction("upload_voice");
        await ctx.replyWithVoice(new InputFile(voiceBuffer, "reply.mp3"));
        return;
      }
    }

    await ctx.reply(agentResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Voice Error]", error);
    await ctx.reply(`Error procesando tu mensaje de voz: ${message}`);
  }
}
