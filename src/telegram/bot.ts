import { Bot, InlineKeyboard, InputFile } from "grammy";
import path from "path";
import { DateTime } from "luxon";
import { authMiddleware } from "./auth";
import { handleTelegramMessage } from "./handlers/message";
import { handleTelegramVoice } from "./handlers/voice";
import { MessageService as WhatsAppService } from "../modules/messages/message.service";
import { ReminderService } from "../modules/reminders/reminder.service";
import { MassDiffusionService } from "../modules/messages/diffusion.service";
import { getSettings, updateSettings, db, listReminders, deleteReminder, createReminder } from "../core/memory";

type TelegramBot = Bot & { ownerId: string };

interface WizardState {
  step: "WAITING_NUMBERS" | "WAITING_MESSAGE" | "WAITING_DATE" | "WAITING_DIFFUSION_NUMBERS" | "WAITING_DIFFUSION_MESSAGE";
  numbers?: string;
  message?: string;
  date?: string;
}
export const wizardState = new Map<string, WizardState>();

export let bot: TelegramBot | null = null;

export function initTelegramBot(
  waService: WhatsAppService,
  reminderService: ReminderService,
  diffusionService: MassDiffusionService
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN no configurado en .env. El bot de Telegram no se iniciará.");
    return;
  }

  const botInstance = new Bot(token) as TelegramBot;
  bot = botInstance;
  bot.ownerId = 'admin-01';
  bot.use(authMiddleware);

  bot.api.setMyCommands([
    { command: "start", description: "Iniciar el bot" },
    { command: "dashboard", description: "Ver panel de control" },
    { command: "recordatorios", description: "Gestión de recordatorios" },
    { command: "masivo", description: "Enviar difusión masiva (/masivo 10 dígitos | Hola)" },
    { command: "cerebro", description: "Ver configuración del bot" },
    { command: "auditoria", description: "Ver últimos 10 movimientos" },
    { command: "borrarmemorial", description: "Borrar memoria del bot" },
  ]).catch(console.error);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🌌 Dashboard Web", "menu_dashboard").row()
      .text("📱 Estado WhatsApp", "menu_status").row()
      .text("📅 Recordatorios", "menu_reminders").row()
      .text("📣 Difusión Masiva", "menu_masivo").row()
      .text("🧠 Cerebro IA", "menu_cerebro").row()
      .text("📊 Auditoría", "menu_auditoria");
    
    await ctx.reply("🦊 ¡Hola! Soy tu asistente maestro de *BotMaRe AI*.\n¿Qué te gustaría hacer hoy?", { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.command(["dashboard", "dashbord"], async (ctx) => {
    const { TunnelService } = await import("../core/tunnel");
    const tunnelUrl = TunnelService.getInstance().getUrl();
    const targetUrl = tunnelUrl || process.env.DASHBOARD_URL || "http://localhost:8000";
    await ctx.reply(`🌌 *BotMaRe Dashboard*\n🔗 ${targetUrl}`, { parse_mode: "Markdown" });
  });

  bot.command(["recordatorios", "recordatorio"], async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("📋 Ver Activos", "view_reminders")
      .text("➕ Crear Nuevo", "new_reminder")
      .row()
      .text("🗑️ Eliminar", "delete_reminder");
    await ctx.reply("📅 *Gestión de Recordatorios*", { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();

    if (data.startsWith("menu_")) {
      await ctx.answerCallbackQuery();
      
      if (data === "menu_dashboard") {
        const { TunnelService } = await import("../core/tunnel");
        const tunnelUrl = TunnelService.getInstance().getUrl();
        const targetUrl = tunnelUrl || process.env.DASHBOARD_URL || "http://localhost:8000";
        await ctx.reply(`🌌 *BotMaRe Dashboard*\n🔗 ${targetUrl}`, { parse_mode: "Markdown" });
      } else if (data === "menu_status") {
        const status = waService.getStatus();
        const isConnected = status.state === 'connected';
        const emoji = isConnected ? '🟢' : '🔴';
        const text = `📱 *Estado de WhatsApp*\n\nEstado: ${emoji} *${status.state.toUpperCase()}*\n\n_Si está desconectado, puedes intentar reiniciar el bot o escanear el QR desde el Dashboard._`;
        await ctx.reply(text, { parse_mode: "Markdown" });
      } else if (data === "menu_reminders") {
        const keyboard = new InlineKeyboard()
          .text("📋 Ver Activos", "view_reminders")
          .text("➕ Crear Nuevo", "new_reminder")
          .row()
          .text("🗑️ Eliminar", "delete_reminder");
        await ctx.reply("📅 *Gestión de Recordatorios*", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_masivo") {
        wizardState.set(userId, { step: 'WAITING_DIFFUSION_NUMBERS' });
        await ctx.reply("📣 ¡Vamos a enviar una Difusión Masiva paso a paso!\n\n¿A qué números o grupos se enviará?\n_(Escribe los números separados por coma. Ej: 10 dígitos o 521XXXXXXXX)_", { parse_mode: "Markdown" });
      } else if (data === "menu_cerebro") {
        const settings = await getSettings() as any;
        const text = `🧠 *Cerebro Actual*\n\n*Nombre:* ${settings.bot_name}\n\n*Prompt:*\n_${settings.system_prompt}_\n\n*Reglas:*\n_${settings.possible_responses}_\n\n💡 _Para editar, usa:_ \`/setname\`, \`/setprompt\`, \`/setrules\``;
        await ctx.reply(text, { parse_mode: "Markdown" });
      } else if (data === "menu_auditoria") {
        try {
            const stmt = db.prepare('SELECT * FROM audits ORDER BY timestamp DESC LIMIT 10');
            const rows = stmt.all() as any[];
            
            if (!rows || rows.length === 0) {
              return await ctx.reply("📊 No hay registros de auditoría aún.");
            }

            const text = rows.map(r => {
                const details = r.details ? (r.details.length > 100 ? r.details.substring(0, 100) + '...' : r.details) : 'Sin detalles';
                return `• [${r.timestamp}] *${r.action}*\n└ ${details}`;
            }).join("\n\n");

            await ctx.reply(`📊 *Últimas 10 Acciones:*\n\n${text}`, { parse_mode: "Markdown" });
        } catch(e: any) {
            console.error("[Telegram Audit Callback Error]", e);
            await ctx.reply(`❌ Error obteniendo auditoría: ${e.message}`);
        }
      }
      return;
    }

    if (data.startsWith("rep_")) {
      const state = wizardState.get(userId);
      if (state && state.step === 'WAITING_DATE') {
         const repeatMap: Record<string, string> = {
            "rep_none": "none",
            "rep_hourly": "hourly",
            "rep_daily": "daily",
            "rep_weekdays": "weekdays",
            "rep_weekly": "weekly",
            "rep_monthly": "monthly",
            "rep_yearly": "yearly"
         };
         const repeat = repeatMap[data] || "none";
         
         const numbers = state.numbers?.split(",").map(n => n.trim()).filter(Boolean) || [];
         for (const num of numbers) {
             await createReminder(userId, num, state.message!, state.date!, undefined, undefined, repeat);
         }
         
         wizardState.delete(userId);
         await ctx.editMessageText(`✅ ¡Listo! Se crearon ${numbers.length} recordatorios programados para el ${state.date} (Repetición: ${repeat}).`);
      }
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith("del_reminder_")) {
      const id = parseInt(data.replace("del_reminder_", ""));
      if (!isNaN(id)) {
        await deleteReminder(id);
        await ctx.answerCallbackQuery({ text: `✅ Recordatorio ${id} eliminado.`, show_alert: true });
        // También podemos editar el mensaje para quitar los botones o informar
        await ctx.editMessageText(`✅ Recordatorio ${id} eliminado exitosamente.`);
      }
      return;
    }

    if (data === "view_reminders") {
      const reminders = await listReminders(userId) as any[];
      if (reminders.length === 0) return ctx.answerCallbackQuery({ text: "No tienes recordatorios activos.", show_alert: true });
      
      let text = "📋 *Tus recordatorios:*\n\n";
      let keyboard = new InlineKeyboard();
      
      reminders.forEach(r => {
        text += `• ID: ${r.id} | ⏰ ${r.time} | 📝 ${r.text}\n`;
        keyboard.text(`🗑️ Eliminar ID: ${r.id}`, `del_reminder_${r.id}`).row();
      });

      await ctx.reply(text, { reply_markup: keyboard, parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
    } else if (data === "new_reminder") {
      wizardState.set(userId, { step: 'WAITING_NUMBERS' });
      await ctx.reply("📲 ¡Vamos a crear un recordatorio paso a paso!\n\n¿Para quién es?\n_(Escribe el número de WhatsApp, Ej: 10 dígitos o 521XXXXXXXX. Usa comas para múltiples números o IDs de grupo)_", { parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
    } else if (data === "delete_reminder") {
      await ctx.reply("Para eliminar un recordatorio, usa el botón de 'Eliminar ID' en la lista de 'Ver Activos', o usa el comando: `/delreminder ID`", { parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
    }
  });

  bot.command("delreminder", async (ctx) => {
    const args = ctx.message?.text.split(" ").slice(1);
    if (!args || args.length === 0) return ctx.reply("⚠️ Proporciona el ID. Ejemplo: `/delreminder 5`", { parse_mode: "Markdown" });
    const id = parseInt(args[0]);
    if (isNaN(id)) return ctx.reply("⚠️ ID inválido.");
    await deleteReminder(id);
    await ctx.reply(`✅ Recordatorio ${id} eliminado.`);
  });

  bot.command("masivo", async (ctx) => {
    const text = ctx.message?.text || "";
    const payload = text.replace("/masivo", "").trim();

    if (payload.includes("|")) {
      const [numbersStr, ...msgParts] = payload.split("|");
      const rawMessage = msgParts.join("|").trim();
      const numbers = numbersStr.split(",").map(n => n.trim()).filter(n => n);

      if (numbers.length === 0 || !rawMessage) {
        return ctx.reply("⚠️ Faltan números o mensaje.");
      }

      const contacts = numbers.map(n => ({ number: n, name: "Usuario" }));
      await ctx.reply(`🚀 Iniciando difusión masiva para ${contacts.length} contactos...`);
      diffusionService.sendMass(contacts, rawMessage).catch(console.error);
      return;
    }

    const userId = ctx.from?.id.toString();
    if (userId) {
      wizardState.set(userId, { step: 'WAITING_DIFFUSION_NUMBERS' });
      await ctx.reply("📣 ¡Vamos a enviar una Difusión Masiva paso a paso!\n\n¿A qué números o grupos se enviará?\n_(Escribe los números separados por coma. Ej: 10 dígitos o 521XXXXXXXX)_", { parse_mode: "Markdown" });
    }
  });

  bot.command("cerebro", async (ctx) => {
    const settings = await getSettings() as any;
    const text = `🧠 *Cerebro Actual*\n\n*Nombre:* ${settings.bot_name}\n\n*Prompt:*\n_${settings.system_prompt}_\n\n*Reglas:*\n_${settings.possible_responses}_\n\n💡 _Para editar, usa:_ \`/setname\`, \`/setprompt\`, \`/setrules\``;
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  bot.command("setname", async (ctx) => {
    const name = ctx.message?.text.replace("/setname", "").trim();
    if (!name) return ctx.reply("⚠️ Debes proporcionar un nombre. Ejemplo: `/setname GravityBot`", { parse_mode: "Markdown" });
    await updateSettings({ bot_name: name });
    await ctx.reply(`✅ Nombre actualizado a: *${name}*`, { parse_mode: "Markdown" });
  });

  bot.command("setprompt", async (ctx) => {
    const prompt = ctx.message?.text.replace("/setprompt", "").trim();
    if (!prompt) return ctx.reply("⚠️ Debes proporcionar un prompt.");
    await updateSettings({ system_prompt: prompt });
    await ctx.reply(`✅ Prompt actualizado.`);
  });

  bot.command("setrules", async (ctx) => {
    const rules = ctx.message?.text.replace("/setrules", "").trim();
    if (!rules) return ctx.reply("⚠️ Debes proporcionar las reglas.");
    await updateSettings({ possible_responses: rules });
    await ctx.reply(`✅ Reglas actualizadas.`);
  });

  bot.command("auditoria", async (ctx) => {
    try {
        const stmt = db.prepare('SELECT * FROM audits ORDER BY timestamp DESC LIMIT 10');
        const rows = stmt.all() as any[];
        
        if (!rows || rows.length === 0) {
            return await ctx.reply("📊 No hay registros de auditoría aún.");
        }

        const text = rows.map(r => {
            const details = r.details ? (r.details.length > 100 ? r.details.substring(0, 100) + '...' : r.details) : 'Sin detalles';
            return `• [${r.timestamp}] *${r.action}*\n└ ${details}`;
        }).join("\n\n");

        await ctx.reply(`📊 *Últimas 10 Acciones:*\n\n${text}`, { parse_mode: "Markdown" });
    } catch(e: any) {
        console.error("[Telegram Audit Error]", e);
        await ctx.reply(`❌ Error obteniendo auditoría: ${e.message}`);
    }
  });

  bot.command(["reset", "reiniciabot", "borrarmemorial"], async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return;
    const { clearHistory } = await import("../core/memory");
    await clearHistory(userId);
    await ctx.reply("🧹 Memoria borrada. ¡Empecemos de nuevo!");
  });

  bot.on("message:voice", handleTelegramVoice);
  
  // Manejador de documentos para restauración (Debe ir antes del manejador de texto general)
  bot.on("message:document", async (ctx) => {
    const caption = ctx.message.caption || "";
    if (caption.toLowerCase() === "/restaurar") {
        const doc = ctx.message.document;
        if (!doc.file_name?.endsWith(".zip") && !doc.file_name?.endsWith(".enc")) {
            return ctx.reply("❌ Por favor, envía un archivo .zip o .zip.enc válido.");
        }

        await ctx.reply("⏳ Procesando restauración... Esto reemplazará todos tus datos.");
        
        try {
            // 1. Obtener link de descarga
            const file = await ctx.getFile();
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            
            // 2. Descargar localmente
            const { BackupService } = require("../modules/system/backup.service");
            const axios = require("axios");
            const fs = require("fs");
            const ext = doc.file_name?.endsWith(".enc") ? ".enc" : ".zip";
            const tempPath = path.join(BackupService.getBackupDir(), `restore_from_telegram${ext}`);
            
            const response = await axios({
                url: fileUrl,
                method: 'GET',
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(tempPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // 3. Ejecutar restauración
            const result = await BackupService.restoreBackup(tempPath);
            
            if (result.success) {
                await ctx.reply("✅ *Restauración Exitosa*\nEl sistema se apagará en 5 segundos. Por favor, vuelve a iniciarlo para aplicar los cambios.", { parse_mode: 'Markdown' });
                setTimeout(() => process.exit(0), 5000);
            } else {
                await ctx.reply("❌ Error: " + result.message);
            }
            
            // Limpiar temporal
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        } catch (error) {
            console.error("Error en restauración via Telegram:", error);
            await ctx.reply("❌ Hubo un error crítico durante la restauración.");
        }
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
         await ctx.reply("❌ Creación de recordatorio cancelada.");
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
               // Intentar con formato am/pm
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
      }
    }

    await handleTelegramMessage(ctx);
  });

  bot.catch((err) => console.error("[Grammy Error]", err));

  bot.start({
    onStart: (botInfo) => {
      console.log(`[Telegram] Bot iniciado como @${botInfo.username}`);
    }
  });
}
