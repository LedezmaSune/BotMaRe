import { Context, InputFile } from "grammy";
import { runAgent } from "../../core/agent";
import { textToSpeech } from "../../core/voice";
import axios from "axios";
import { bot } from "../bot";

export async function handleTelegramMessage(ctx: Context) {
  const userId = ctx.from?.id.toString();
  let text = ctx.message?.text || ctx.message?.caption || "";
  if (!userId) return;

  const hasMedia = !!(ctx.message?.photo || ctx.message?.document);
  let isCommand = false;
  let iaPrompt = text;

  if (text) {
      const lowerText = text.trim().toLowerCase();
      isCommand = lowerText.startsWith("/ia ") || lowerText.startsWith("/dash ") || lowerText === "/ia" || lowerText === "/dash";
      if (isCommand) {
          iaPrompt = text.replace(/^\/(ia|dash)\s*/i, '').trim();
      }
  }

  // Si no es un comando explícito y tampoco tiene multimedia, lo ignoramos
  if (!isCommand && !hasMedia) {
    return;
  }

  console.log(`[Telegram] AI Command from ${userId}: ${iaPrompt.substring(0, 50)}...`);
  await ctx.replyWithChatAction("typing");

  try {
    let imageBase64: string | undefined = undefined;

    // 1. Procesar Imágenes (Fotos)
    if (ctx.message?.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Mayor resolución
        const file = await ctx.api.getFile(photo.file_id);
        const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        imageBase64 = Buffer.from(response.data).toString('base64');
    }
    
    // 2. Procesar Documentos (Archivos de Texto, PDF, Word, Excel)
    if (ctx.message?.document) {
        const doc = ctx.message.document;
        const ext = doc.file_name?.toLowerCase().split('.').pop() || '';
        const validExts = ['txt', 'md', 'csv', 'pdf', 'docx', 'xlsx', 'xls'];
        
        if (doc.mime_type === 'text/plain' || validExts.includes(ext)) {
            const file = await ctx.api.getFile(doc.file_id);
            const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            
            const { parseDocument } = await import('../../utils/documentParser');
            const parsedText = await parseDocument(Buffer.from(response.data), doc.file_name || 'document.txt');
            
            if (parsedText) {
                iaPrompt += `\n\n[CONTENIDO DEL DOCUMENTO ${doc.file_name}]:\n${parsedText.substring(0, 50000)}`;
            } else {
                await ctx.reply(`⚠️ Descargué el documento ${doc.file_name}, pero estaba vacío o no pude extraer texto.`);
            }
        } else {
            await ctx.reply(`⚠️ El documento ${doc.file_name} tiene un formato no soportado. Usa PDF, Word, Excel o TXT.`);
        }
    }

    if (!iaPrompt && !imageBase64) {
      await ctx.reply("🤖 Por favor, escribe tu instrucción después del comando o envía una imagen/documento.", { parse_mode: "Markdown" });
      return;
    }

    const agentResponse = await runAgent(userId, iaPrompt, userId, imageBase64, true);
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
