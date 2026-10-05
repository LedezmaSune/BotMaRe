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

    const lowerText = text.trim().toLowerCase();
    const isBotmareKeyword = lowerText.startsWith("botmare") || lowerText.startsWith("sistema") || lowerText.startsWith("ia");
    
    if (!isBotmareKeyword) {
      await ctx.reply(`📝 _"${text}"_\n\n(Audio ignorado. Para órdenes por voz, inicia tu frase con "BotMaRe", "IA" o "Sistema").`, { parse_mode: "Markdown" });
      return;
    }

    // Send transcription back to user
    await ctx.reply(`📝 _"${text}"_`, { parse_mode: "Markdown" });

    // Process with Agent
    await ctx.replyWithChatAction("typing");
    
    const agentResponse = await runAgent(userId, text, userId, undefined, true);
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
