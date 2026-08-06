import { Bot, InlineKeyboard } from "grammy";
import { wizardState, pendingRestores } from "./state";
import { DateTime } from "luxon";
import { createReminder } from "../core/memory";
import { MassDiffusionService } from "../modules/messages/diffusion.service";
import { handleTelegramMessage } from "./handlers/message";
import { handleTelegramVoice } from "./handlers/voice";
import { BackupService } from "../modules/system/backup.service";

export function registerWizards(bot: Bot, diffusionService: MassDiffusionService) {
  bot.on("message:voice", handleTelegramVoice);
  
  bot.on("message:document", async (ctx) => {
    const caption = ctx.message.caption || "";
    if (caption.toLowerCase() === "/restaurar") {
        const userId = ctx.from?.id.toString();
        if (!userId) return;

        const doc = ctx.message.document;
        if (!doc.file_name?.endsWith(".zip") && !doc.file_name?.endsWith(".enc")) {
            return ctx.reply("❌ *Archivo no Soportado*\n\nPor favor, envía un archivo con extensión `.zip` o `.zip.enc` válido.", { parse_mode: "Markdown" });
        }

        // Guardar restauración pendiente en el mapa
        pendingRestores.set(userId, {
            fileId: doc.file_id,
            fileName: doc.file_name
        });

        const keyboard = new InlineKeyboard()
          .text("⚠️ SÍ, RESTAURAR AHORA", "confirm_restore").row()
          .text("🛑 CANCELAR", "cancel_restore");

        await ctx.reply(
          `⚠️ *¡ALERTA DE SEGURIDAD CRÍTICA!*\n\n` +
          `Estás intentando restaurar la base de datos con el archivo: \`${doc.file_name}\`.\n\n` +
          `*Esta acción es irreversible y destructiva:*\n` +
          `• Sobrescribirá toda la base de datos de recordatorios y auditoría.\n` +
          `• Reemplazará todas las credenciales de WhatsApp activas.\n` +
          `• El servidor se detendrá por completo para reiniciar.\n\n` +
          `¿Deseas continuar bajo tu propia responsabilidad?`,
          { reply_markup: keyboard, parse_mode: "Markdown" }
        );
    }
  });

  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return next();

    // Check if user is in wizard
    const state = wizardState.get(userId);
    if (state) {
      if (ctx.message.text.toLowerCase() === '/cancelar') {
         wizardState.delete(userId);
         await ctx.reply("❌ Acción cancelada exitosamente.");
         return;
      }

      if (state.step === 'WAITING_NUMBERS') {
        state.numbers = ctx.message.text;
        state.step = 'WAITING_MESSAGE';
        await ctx.reply("📝 ¡Entendido! Ahora, escribe el mensaje del recordatorio:\n_(Si deseas cancelar, escribe /cancelar)_", { parse_mode: "Markdown" });
        return;
      } else if (state.step === 'WAITING_MESSAGE') {
        state.message = ctx.message.text;
        state.step = 'WAITING_DATE';
        await ctx.reply("📅 ¿Para qué fecha y hora (CDMX)?\nEscribe en formato `dd/mm/aaaa HH:MM` (Ej. 30/12/2026 15:30) o con am/pm (Ej. 30/12/2026 03:30 pm).\nTambién puedes escribir `ahora`.", { parse_mode: "Markdown" });
        return;
      } else if (state.step === 'WAITING_DATE') {
        let finalDateStr = "";
        const input = ctx.message.text.trim().toLowerCase();
        if (input === 'ahora') {
           finalDateStr = DateTime.now().setZone('America/Mexico_City').toFormat("yyyy-MM-dd'T'HH:mm");
        } else {
           let parsed = DateTime.fromFormat(ctx.message.text.trim(), "dd/MM/yyyy HH:mm", { zone: 'America/Mexico_City' });
           if (!parsed.isValid) {
               parsed = DateTime.fromFormat(ctx.message.text.trim(), "dd/MM/yyyy hh:mm a", { zone: 'America/Mexico_City' });
           }
           if (!parsed.isValid) {
              await ctx.reply("⚠️ Formato inválido. Usa `dd/mm/aaaa HH:MM` (ej. 30/12/2026 15:30) o con am/pm (ej. 30/12/2026 03:30 pm), o escribe `ahora`.", { parse_mode: "Markdown" });
              return;
           }
           finalDateStr = parsed.toFormat("yyyy-MM-dd'T'HH:mm");
        }
        
        state.date = finalDateStr;
        
        let kb = new InlineKeyboard()
          .text("No se repite", "rep_none").row()
          .text("Cada hora", "rep_hourly").row()
          .text("Diariamente", "rep_daily").row()
          .text("Entre semana (lun-vie)", "rep_weekdays").row()
          .text("Semanalmente", "rep_weekly").row()
          .text("Mensualmente", "rep_monthly").row()
          .text("Anual", "rep_yearly");

        await ctx.reply("🔁 Por último, ¿con qué frecuencia se repetirá?", { reply_markup: kb });
        return;
      } else if (state.step === 'WAITING_DIFFUSION_NUMBERS') {
        state.numbers = ctx.message.text;
        state.step = 'WAITING_DIFFUSION_MESSAGE';
        await ctx.reply("📝 ¡Excelente! Ahora escribe el mensaje masivo que vas a enviar:\n_(Si deseas cancelar, escribe /cancelar)_", { parse_mode: "Markdown" });
        return;
      } else if (state.step === 'WAITING_DIFFUSION_MESSAGE') {
        const rawMessage = ctx.message.text;
        const numbers = state.numbers?.split(",").map(n => n.trim()).filter(Boolean) || [];
        
        wizardState.delete(userId);

        if (numbers.length === 0) {
           await ctx.reply("⚠️ No se detectaron números válidos. Difusión cancelada.");
           return;
        }

        const contacts = numbers.map(n => ({ number: n, name: "Usuario" }));
        await ctx.reply(`🚀 Iniciando difusión masiva para ${contacts.length} contactos...`);
        diffusionService.sendMass(contacts, rawMessage).catch(console.error);
        return;
      } else if (state.step === 'WAITING_LISTA_ID') {
          // Lógica de listas
          const idInput = ctx.message.text.trim();
          const { accessControl } = await import("../core/accessControl");
          const isGroup = state.listaContext === 'grupos';
          const command = `!lista ${state.listaAction} ${idInput}`;
          const response = accessControl.processAdminCommand(command, isGroup);
          wizardState.delete(userId);
          await ctx.reply(response, { parse_mode: "Markdown" });
          return;
      }
    }

    await handleTelegramMessage(ctx);
  });
}
