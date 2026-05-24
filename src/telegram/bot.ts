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
import { getConfig } from "../core/config";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
    { command: "notificaciones", description: "Alternar notificaciones de modelos (ON/OFF)" },
    { command: "actualizar", description: "Buscar y aplicar actualizaciones de GitHub" },
    { command: "tunel", description: "Ver estado o reiniciar el túnel Cloudflare" },
    { command: "ssh", description: "Generar túnel SSH reverso con tmate" },
    { command: "tailscale", description: "Ver IP y estado de la red privada Tailscale" },
    { command: "pm2", description: "Control de procesos PM2" },
    { command: "borrarmemorial", description: "Borrar memoria del bot" },
  ]).catch(console.error);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🌌 Dashboard Web", "menu_dashboard").row()
      .text("📱 Estado WhatsApp", "menu_status").row()
      .text("📅 Recordatorios", "menu_reminders").row()
      .text("📣 Difusión Masiva", "menu_masivo").row()
      .text("🧠 Cerebro IA", "menu_cerebro").row()
      .text("📊 Auditoría", "menu_auditoria").row()
      .text("🔔 Notificaciones Modelos", "menu_notificaciones").row()
      .text("🔄 Actualizaciones", "menu_actualizar")
      .text("🌐 Túnel Cloudflare", "menu_tunel").row()
      .text("🧑‍💻 Acceso SSH (tmate)", "menu_ssh")
      .text("🛡️ Red Tailscale", "menu_tailscale").row()
      .text("⚙️ Control PM2", "menu_pm2");
    
    await ctx.reply(`🦊 ¡Hola! Soy tu asistente maestro de *${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe'}*.\n¿Qué te gustaría hacer hoy?`, { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.command(["dashboard", "dashbord"], async (ctx) => {
    const { TunnelService } = await import("../core/tunnel");
    const tunnelUrl = TunnelService.getInstance().getUrl();
    const targetUrl = tunnelUrl || process.env.DASHBOARD_URL || "http://localhost:8000";
    await ctx.reply(`🌌 *${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe'} Dashboard*\n🔗 ${targetUrl}`, { parse_mode: "Markdown" });
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
        await ctx.reply(`🌌 *${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe'} Dashboard*\n🔗 ${targetUrl}`, { parse_mode: "Markdown" });
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
      } else if (data === "menu_notificaciones") {
        const isEnabled = await getConfig('NOTIFY_MODELS_TELEGRAM', 'false');
        const newState = isEnabled === 'true' ? 'false' : 'true';
        await updateSettings({ NOTIFY_MODELS_TELEGRAM: newState });
        await ctx.answerCallbackQuery({ text: `Notificaciones ${newState === 'true' ? 'ACTIVADAS' : 'DESACTIVADAS'}`, show_alert: true });
        await ctx.reply(`🔔 *Notificaciones de Modelos:* ${newState === 'true' ? '✅ ACTIVADAS' : '❌ DESACTIVADAS'}`, { parse_mode: "Markdown" });
      } else if (data === "menu_pm2") {
        const keyboard = new InlineKeyboard()
          .text("📊 Estado", "pm2_status")
          .text("🔄 Reiniciar", "pm2_restart").row()
          .text("📜 Ver Logs", "pm2_logs")
          .text("♻️ Limpiar Logs", "pm2_flush");
        await ctx.reply("⚙️ *Panel de Control PM2*\nSelecciona una acción para gestionar el proceso del bot:", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_actualizar") {
        const keyboard = new InlineKeyboard()
          .text("🔍 Buscar Actualización", "update_check").row()
          .text("⬆️ Aplicar Actualización", "update_apply");
        await ctx.reply("🔄 *Centro de Actualizaciones*\nVerifica si hay una nueva versión disponible en GitHub.", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_tunel") {
        const { TunnelService } = await import("../core/tunnel");
        const tunnel = TunnelService.getInstance();
        const currentUrl = tunnel.getUrl();
        const statusText = currentUrl
          ? `🟢 *Túnel Activo*\n🔗 ${currentUrl}`
          : `🔴 *Túnel Inactivo*\nNo hay túnel en ejecución.`;
        const keyboard = new InlineKeyboard()
          .text("🔄 Reiniciar Túnel", "tunnel_restart").row()
          .text("⏹️ Detener Túnel", "tunnel_stop");
        await ctx.reply(`🌐 *Cloudflare Tunnel*\n\n${statusText}`, { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_ssh") {
        const keyboard = new InlineKeyboard()
          .text("🚀 Iniciar Sesión SSH", "ssh_start").row()
          .text("⏹️ Detener Sesión", "ssh_stop");
        await ctx.reply("🧑‍💻 *Acceso SSH Remoto (tmate)*\n\nGenera un túnel SSH reverso seguro para acceder a la terminal del sistema remotamente.", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_tailscale") {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        let tailscaleIp = null;
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && iface.address.startsWith('100.')) {
              tailscaleIp = iface.address;
              break;
            }
          }
        }
        
        if (tailscaleIp) {
            const port = process.env.PORT || 8000;
            await ctx.reply(`🛡️ *Red Privada Activa (Tailscale)*\n\nEl dispositivo está conectado a la malla.\n\n🌐 *Enlace Directo y Seguro:*\n\`http://${tailscaleIp}:${port}\`\n\n_Solo accesible para dispositivos en tu cuenta de Tailscale._`, { parse_mode: "Markdown" });
        } else {
            await ctx.reply(`🔴 *Tailscale Inactivo o no detectado*\n\nNo se encontró una IP de red privada (100.x.x.x).\n\nPara configurarlo:\n1. Descarga la app **Tailscale** en este dispositivo.\n2. Inicia sesión y activa el VPN.\n3. Vuelve a tocar este botón.`, { parse_mode: "Markdown" });
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

    if (data.startsWith("reactivate_ia_")) {
      const chatIdToReactivate = data.replace("reactivate_ia_", "");
      const { unpauseChat } = await import("../core/memory");
      await unpauseChat(chatIdToReactivate);
      
      await ctx.answerCallbackQuery({ text: "✅ IA Reactivada exitosamente.", show_alert: true });
      await ctx.editMessageText(`✅ *IA Reactivada*\nEl bot volverá a responder automáticamente en el chat \`${chatIdToReactivate.replace('@s.whatsapp.net', '')}\`.`, { parse_mode: "Markdown" });
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

    // Handlers para PM2
    if (data.startsWith("pm2_")) {
      const action = data.replace("pm2_", "");
      await ctx.answerCallbackQuery({ text: "Procesando comando PM2..." });

      // Detectar si estamos en PM2
      const isUnderPM2 = process.env.pm_id !== undefined || process.env.PM2_HOME !== undefined;
      const appName = "BotMaRe-Unified";

      if (!isUnderPM2 && action !== 'status') {
         return await ctx.reply("⚠️ *Aviso de Entorno*\n\nEl sistema no parece estar corriendo bajo *PM2* (estás en modo Dev o Start directo). Esta función de control solo está activa cuando usas la opción 2 del Manager (Modo Producción).", { parse_mode: "Markdown" });
      }

      try {
        switch (action) {
          case "status":
            try {
                const { stdout: statusOut } = await execAsync(`pm2 status ${appName} --no-color`);
                if (!statusOut.includes(appName)) {
                    return await ctx.reply("ℹ️ *PM2 está instalado pero este proceso no está registrado.*\nPara usar el control total, inicia con `pnpm run pm2:start` o usa la opción 2 del Manager.", { parse_mode: "Markdown" });
                }
                return await ctx.reply(`📊 *Estado de PM2:*\n\`\`\`\n${statusOut}\n\`\`\``, { parse_mode: "Markdown" });
            } catch (e) {
                return await ctx.reply("❌ *PM2 no disponible*\nNo se pudo encontrar el comando `pm2` en el sistema.");
            }
          
          case "restart":
            await ctx.reply("🔄 Reiniciando el proceso... La conexión se perderá por unos segundos.");
            // Pequeño delay para asegurar que el mensaje sale
            setTimeout(async () => {
                try {
                    await execAsync(`pm2 restart ${appName}`);
                } catch (e: any) {
                    console.error("Error al reiniciar via PM2:", e.message);
                }
            }, 1000);
            return;
          
          case "logs":
            const { stdout: logsOut } = await execAsync(`pm2 logs ${appName} --lines 15 --no-colors --raw`);
            return await ctx.reply(`📜 *Últimos Logs:*\n\`\`\`\n${logsOut}\n\`\`\``, { parse_mode: "Markdown" });
          
          case "flush":
            await execAsync(`pm2 flush`);
            return await ctx.reply("✅ Logs de PM2 limpiados.");
        }
      } catch (error: any) {
        await ctx.reply(`❌ *Error de Sistema:*\n${error.message}`);
      }
    }

    // Handlers para Actualizaciones
    if (data.startsWith("update_")) {
      const action = data.replace("update_", "");
      await ctx.answerCallbackQuery({ text: "Procesando..." });

      try {
        const { UpdateService } = await import("../modules/system/update.service");
        const updateService = new UpdateService();

        if (action === "check") {
          const result = await updateService.checkUpdate();
          if (result.error) {
            await ctx.reply(`❌ *Error al verificar:*\n${result.error}`, { parse_mode: "Markdown" });
          } else if (result.updateAvailable) {
            const keyboard = new InlineKeyboard()
              .text("⬆️ Aplicar Actualización Ahora", "update_apply");
            await ctx.reply(
              `🆕 *¡Actualización Disponible!*\n\n` +
              `📌 Versión local: \`${result.currentVersion}\`\n` +
              `🔹 Commit local: \`${result.localCommit}\`\n` +
              `🔸 Commit remoto: \`${result.remoteCommit}\`\n\n` +
              `¿Deseas aplicarla?`,
              { reply_markup: keyboard, parse_mode: "Markdown" }
            );
          } else {
            await ctx.reply(`✅ *Sistema al día*\n\nVersión: \`${result.currentVersion}\`\nCommit: \`${result.localCommit}\`\n\nTu instalación coincide con la última versión de GitHub.`, { parse_mode: "Markdown" });
          }
        } else if (action === "apply") {
          await ctx.reply("⏳ *Aplicando actualización...*\n\nDescargando última versión de GitHub. El sistema se reiniciará automáticamente si usa PM2.", { parse_mode: "Markdown" });
          const result = await updateService.performUpdate();
          if (result.success) {
            await ctx.reply(`✅ *Actualización Aplicada*\n\n${result.message}`, { parse_mode: "Markdown" });
          } else {
            await ctx.reply(`❌ *Error al actualizar:*\n${result.error}`, { parse_mode: "Markdown" });
          }
        }
      } catch (error: any) {
        await ctx.reply(`❌ *Error:* ${error.message}`, { parse_mode: "Markdown" });
      }
      return;
    }

    // Handlers para Túnel Cloudflare
    if (data.startsWith("tunnel_")) {
      const action = data.replace("tunnel_", "");
      await ctx.answerCallbackQuery({ text: "Procesando..." });

      try {
        const { TunnelService } = await import("../core/tunnel");
        const tunnel = TunnelService.getInstance();
        const PORT = process.env.PORT || 8000;

        if (action === "restart") {
          await ctx.reply("🔄 *Reiniciando túnel...*\nEsto puede tomar unos segundos.", { parse_mode: "Markdown" });
          tunnel.stop();
          try {
            const newUrl = await tunnel.start(Number(PORT));
            await ctx.reply(`✅ *Túnel Reiniciado*\n\n🔗 Nueva URL: ${newUrl}`, { parse_mode: "Markdown" });
          } catch (e: any) {
            await ctx.reply(`❌ *No se pudo iniciar el túnel*\n${e.message}\n\n_Verifica que cloudflared esté instalado._`, { parse_mode: "Markdown" });
          }
        } else if (action === "stop") {
          tunnel.stop();
          await ctx.reply("⏹️ *Túnel Detenido*\n\nEl bot seguirá funcionando en la red local.", { parse_mode: "Markdown" });
        }
      } catch (error: any) {
        await ctx.reply(`❌ *Error:* ${error.message}`, { parse_mode: "Markdown" });
      }
      return;
    }

    // Handlers para SSH (tmate)
    if (data.startsWith("ssh_")) {
      const action = data.replace("ssh_", "");
      await ctx.answerCallbackQuery({ text: "Procesando..." });

      try {
        if (action === "start") {
          // Check if tmate is installed
          try {
            await execAsync('command -v tmate || which tmate');
          } catch {
            return await ctx.reply("⚠️ *tmate no está instalado o no es compatible con este sistema.*\n\nInstálalo ejecutando:\n- Termux: `pkg install tmate`\n- Ubuntu/Debian: `sudo apt install tmate`\n\n_(Nota: tmate no funciona en Windows)_", { parse_mode: "Markdown" });
          }

          await ctx.reply("⏳ Generando sesión SSH segura...", { parse_mode: "Markdown" });
          
          // Start tmate in background
          try {
            await execAsync('tmate -S /tmp/tmate.sock new-session -d');
            await execAsync('tmate -S /tmp/tmate.sock wait tmate-ready');
            const { stdout } = await execAsync("tmate -S /tmp/tmate.sock display -p '#{tmate_ssh}'");
            
            const sshCommand = stdout.trim();
            if (sshCommand) {
              const keyboard = new InlineKeyboard().text("⏹️ Detener Sesión Segura", "ssh_stop");
              await ctx.reply(`✅ *Sesión SSH Activa*\n\nCopia y pega este comando en cualquier terminal para conectarte:\n\n\`${sshCommand}\`\n\n⚠️ _Por seguridad, no compartas este enlace._`, { reply_markup: keyboard, parse_mode: "Markdown" });
            } else {
              await ctx.reply("❌ *Error:* No se pudo obtener la URL de tmate.", { parse_mode: "Markdown" });
            }
          } catch (e: any) {
            await ctx.reply(`❌ *Error al iniciar tmate:* ${e.message}`, { parse_mode: "Markdown" });
          }

        } else if (action === "stop") {
          try {
            await execAsync('tmate -S /tmp/tmate.sock kill-server');
            await ctx.reply("⏹️ *Sesión SSH detenida y servidor cerrado.*", { parse_mode: "Markdown" });
          } catch {
            await ctx.reply("ℹ️ No había ninguna sesión SSH activa.", { parse_mode: "Markdown" });
          }
        }
      } catch (error: any) {
        await ctx.reply(`❌ *Error de Sistema:* ${error.message}`, { parse_mode: "Markdown" });
      }
      return;
    }
  });

  bot.command(["actualizar", "update"], async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🔍 Buscar Actualización", "update_check").row()
      .text("⬆️ Aplicar Actualización", "update_apply");
    await ctx.reply("🔄 *Centro de Actualizaciones*\nVerifica si hay una nueva versión disponible en GitHub.", { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.command(["tunel", "tunnel"], async (ctx) => {
    const { TunnelService } = await import("../core/tunnel");
    const tunnel = TunnelService.getInstance();
    const currentUrl = tunnel.getUrl();
    const statusText = currentUrl
      ? `🟢 *Túnel Activo*\n🔗 ${currentUrl}`
      : `🔴 *Túnel Inactivo*\nNo hay túnel en ejecución.`;
    const keyboard = new InlineKeyboard()
      .text("🔄 Reiniciar Túnel", "tunnel_restart").row()
      .text("⏹️ Detener Túnel", "tunnel_stop");
    await ctx.reply(`🌐 *Cloudflare Tunnel*\n\n${statusText}`, { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.command(["ssh", "tmate"], async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🚀 Iniciar Sesión SSH", "ssh_start").row()
      .text("⏹️ Detener Sesión", "ssh_stop");
    await ctx.reply("🧑‍💻 *Acceso SSH Remoto (tmate)*\n\nGenera un túnel SSH reverso seguro para acceder a la terminal del sistema remotamente.", { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.command(["tailscale", "vpn"], async (ctx) => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let tailscaleIp = null;
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && iface.address.startsWith('100.')) {
          tailscaleIp = iface.address;
          break;
        }
      }
    }
    
    if (tailscaleIp) {
        const port = process.env.PORT || 8000;
        await ctx.reply(`🛡️ *Red Privada Activa (Tailscale)*\n\nEl dispositivo está conectado a la malla.\n\n🌐 *Enlace Directo y Seguro:*\n\`http://${tailscaleIp}:${port}\`\n\n_Solo accesible para dispositivos en tu cuenta de Tailscale._`, { parse_mode: "Markdown" });
    } else {
        await ctx.reply(`🔴 *Tailscale Inactivo o no detectado*\n\nNo se encontró una IP de red privada (100.x.x.x).\n\nPara configurarlo:\n1. Descarga la app **Tailscale** en este dispositivo.\n2. Inicia sesión y activa el VPN.\n3. Vuelve a intentar el comando.`, { parse_mode: "Markdown" });
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
  
  bot.command("notificaciones", async (ctx) => {
    const isEnabled = await getConfig('NOTIFY_MODELS_TELEGRAM', 'false');
    const newState = isEnabled === 'true' ? 'false' : 'true';
    await updateSettings({ NOTIFY_MODELS_TELEGRAM: newState });
    await ctx.reply(`🔔 *Notificaciones de Modelos:* ${newState === 'true' ? '✅ ACTIVADAS' : '❌ DESACTIVADAS'}\n\n_Recibirás un mensaje cada vez que un modelo de IA responda, falle o tenga límites bajos._`, { parse_mode: "Markdown" });
  });

  bot.command("pm2", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("📊 Estado", "pm2_status")
      .text("🔄 Reiniciar", "pm2_restart").row()
      .text("📜 Ver Logs", "pm2_logs")
      .text("♻️ Limpiar Logs", "pm2_flush");
    await ctx.reply("⚙️ *Panel de Control PM2*\nSelecciona una acción:", { reply_markup: keyboard, parse_mode: "Markdown" });
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
