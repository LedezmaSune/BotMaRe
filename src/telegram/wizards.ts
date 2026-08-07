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
        await ctx.reply("📝 *Paso 2/3: Contenido del Recordatorio*\n\n¡Entendido! Ahora escribe el texto del recordatorio que se enviará:\n\n💡 _(Si deseas cancelar, escribe `/cancelar`)_", { parse_mode: "Markdown" });
        return;
      } else if (state.step === 'WAITING_MESSAGE') {
        state.message = ctx.message.text;
        state.step = 'WAITING_DATE';
        await ctx.reply("⏰ *Paso 3/3: Fecha y Hora de Envío*\n\n¿Cuándo deseas enviarlo? (Zona Horaria CDMX 🇲🇽)\n\n🗓️ Formato: `dd/mm/aaaa HH:MM` (Ej: `30/12/2026 15:30` o `03:30 pm`)\n⚡ O escribe `ahora` para enviarlo de inmediato.", { parse_mode: "Markdown" });
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
              await ctx.reply("⚠️ *Formato de fecha u hora no reconocido*\n\nPor favor usa el formato `dd/mm/aaaa HH:MM` (ej: `30/12/2026 15:30`) o escribe `ahora`.", { parse_mode: "Markdown" });
              return;
           }
           finalDateStr = parsed.toFormat("yyyy-MM-dd'T'HH:mm");
        }
        
        state.date = finalDateStr;
        
        let kb = new InlineKeyboard()
          .text("🚫 Sin repetición (Una vez)", "rep_none").row()
          .text("⏱️ Cada hora", "rep_hourly").row()
          .text("☀️ Diariamente", "rep_daily").row()
          .text("💼 Días laborables (Lun - Vie)", "rep_weekdays").row()
          .text("📅 Semanalmente", "rep_weekly").row()
          .text("🗓️ Mensualmente", "rep_monthly").row()
          .text("🎂 Anualmente", "rep_yearly");

        await ctx.reply("🔁 *Frecuencia de Repetición*\n\n¿Con qué frecuencia se repetirá este recordatorio?", { reply_markup: kb, parse_mode: "Markdown" });
        return;
      } else if (state.step === 'WAITING_DIFFUSION_NUMBERS') {
        state.numbers = ctx.message.text;
        state.step = 'WAITING_DIFFUSION_MESSAGE';
        await ctx.reply("📝 *Paso 2/2: Mensaje de Difusión*\n\n¡Excelente! Escribe ahora el mensaje masivo que deseas transmitir:\n\n💡 _(Si deseas cancelar, escribe `/cancelar`)_", { parse_mode: "Markdown" });
        return;
      } else if (state.step === 'WAITING_DIFFUSION_MESSAGE') {
        const rawMessage = ctx.message.text;
        const numbers = state.numbers?.split(",").map(n => n.trim()).filter(Boolean) || [];
        
        wizardState.delete(userId);

        if (numbers.length === 0) {
           await ctx.reply("⚠️ *Sin números válidos*\n\nNo se detectaron destinatarios válidos. La campaña de difusión fue cancelada.", { parse_mode: "Markdown" });
           return;
        }

        const contacts = numbers.map(n => ({ number: n, name: "Usuario" }));
        await ctx.reply(`🚀 *¡Despegando Campaña Masiva!*\n\nEnviando difusión a *${contacts.length}* destinatarios...`, { parse_mode: "Markdown" });
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
