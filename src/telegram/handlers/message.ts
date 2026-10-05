import { Context, InputFile } from "grammy";
import { runAgent } from "../../core/agent";
import { textToSpeech } from "../../core/voice";
import { bot } from "../bot";

export async function handleTelegramMessage(ctx: Context) {
  const userId = ctx.from?.id.toString();
  const text = ctx.message?.text;
  if (!userId || !text) return;

  const lowerText = text.trim().toLowerCase();
  const isCommand = lowerText.startsWith("/ia ") || lowerText.startsWith("/dash ") || lowerText === "/ia" || lowerText === "/dash";
  
  if (!isCommand) {
    return;
  }

  const iaPrompt = text.replace(/^\/(ia|dash)\s*/i, '').trim();
  if (!iaPrompt) {
      await ctx.reply("🤖 Por favor, escribe tu instrucción después del comando. Ejemplo: `/ia ¿cuántos mensajes se enviaron hoy?`", { parse_mode: "Markdown" });
      return;
  }

  console.log(`[Telegram] AI Command from ${userId}: ${iaPrompt.substring(0, 50)}...`);
  await ctx.replyWithChatAction("typing");

  try {
    const adminContext = `\n\n[SISTEMA: Eres el Asistente de Administración de BotMaRe. Estás hablando con el dueño del sistema desde Telegram. Tienes acceso a herramientas para consultar el servidor. Tu objetivo es obedecer sus órdenes técnicas y reportar datos con precisión.]`;
    const agentResponse = await runAgent(userId, iaPrompt + adminContext, userId, undefined, true);
    const needsVoice = /voz|audio|habla|dímelo|escuchar/i.test(iaPrompt);

    if (needsVoice) {
      await handleTelegramVoiceResponse(ctx, agentResponse);
    } else {
      await ctx.reply(agentResponse);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Telegram Error]", error);
    await ctx.reply(`Error processing your request: ${message}`);
  }
}

async function handleTelegramVoiceResponse(ctx: Context, text: string) {
  try {
    const voiceBuffer = await textToSpeech(text);
    if (voiceBuffer) {
      await ctx.replyWithChatAction("upload_voice");
      await ctx.replyWithVoice(new InputFile(voiceBuffer, "reply.mp3"));
    } else {
      await ctx.reply(text);
    }
  } catch (error) {
    console.error("Audio failure:", error);
    await ctx.reply(text);
  }
}
