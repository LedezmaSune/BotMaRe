import { Bot, InlineKeyboard } from "grammy";
import { wizardState, pendingRestores } from "./state";
import { MessageService as WhatsAppService } from "../modules/messages/message.service";
import { getSettings, updateSettings, listAudits, listReminders, deleteReminder } from "../core/memory";
import { getConfig } from "../core/config";
import { BackupService } from "../modules/system/backup.service";
import { accessControl } from "../core/accessControl";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import path from "path";
import os from "os";
import fs from "fs";

const execAsync = promisify(exec);
const createSecureWriteStream = fs.createWriteStream;
const checkFileExists = fs.existsSync;
const deleteFile = fs.unlinkSync;

export function registerCallbacks(bot: Bot, waService: WhatsAppService) {
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
      } else if (data === "menu_sheets") {
        const keyboard = new InlineKeyboard()
          .text("🔄 Sincronizar Ahora", "sheets_sync").row();
        await ctx.reply("📊 *Google Sheets*\n\nSincroniza tus autorespondedores desde tu hoja de cálculo configurada de forma remota.", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_lista") {
        const keyboard = new InlineKeyboard()
          .text("👤 Administrar Contactos", "lista_cat_contactos").row()
          .text("👥 Administrar Grupos", "lista_cat_grupos").row();
        await ctx.reply("🛡️ *Control de Listas de Acceso*\n\nSelecciona la categoría que deseas configurar:", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data.startsWith("lista_cat_")) {
        const cat = data.replace("lista_cat_", ""); 
        const isGroup = cat === 'grupos';
        const config = accessControl.getConfig();
        const currentList = isGroup ? config.groups : config.contacts;
        
        let currentModeText = '';
        switch(currentList.mode) {
           case 'all': currentModeText = '🔓 Abierto (Todos)'; break;
           case 'whitelist': currentModeText = '🟢 Lista Blanca'; break;
           case 'blacklist': currentModeText = '🔴 Lista Negra'; break;
           case 'none': currentModeText = '🔕 Silenciado (Nadie)'; break;
        }

        const keyboard = new InlineKeyboard()
          .text("🟢 Modo Whitelist", `lista_action_mode_whitelist_${cat}`)
          .text("🔴 Modo Blacklist", `lista_action_mode_blacklist_${cat}`).row()
          .text("🔓 Modo Todos", `lista_action_mode_all_${cat}`).row()
          .text("➕ Agregar a Whitelist", `lista_action_add_${cat}`)
          .text("⛔ Bloquear", `lista_action_ban_${cat}`).row()
          .text("🗑️ Eliminar de listas", `lista_action_remove_${cat}`).row()
          .text("🔙 Volver", "menu_lista");

        await ctx.editMessageText(
           `🛡️ *Control de ${cat === 'grupos' ? 'Grupos' : 'Contactos'}*\n\n` +
           `*Modo Actual:* ${currentModeText}\n` +
           `*Whitelist:* ${currentList.whitelist.length} | *Blacklist:* ${currentList.blacklist.length}\n\n` +
           `¿Qué deseas hacer?`,
           { reply_markup: keyboard, parse_mode: "Markdown" }
        );
      } else if (data.startsWith("lista_action_")) {
        const parts = data.replace("lista_action_", "").split("_");
        const action = parts[0]; 
        
        if (action === "mode") {
           const modeValue = parts[1];
           const cat = parts[2]; 
           const isGroup = cat === 'grupos';
           const response = accessControl.processAdminCommand(`!lista mode ${modeValue}`, isGroup);
           await ctx.answerCallbackQuery({ text: "✅ Modo actualizado", show_alert: true });
           const keyboard = new InlineKeyboard().text("🔙 Volver a opciones", `lista_cat_${cat}`);
           await ctx.editMessageText(response, { reply_markup: keyboard, parse_mode: "Markdown" });
        } else {
           const cat = parts[1];
           const isGroup = cat === 'grupos';
           wizardState.set(userId, { step: 'WAITING_LISTA_ID', listaContext: isGroup ? 'grupos' : 'contactos', listaAction: action as any });
           let actionText = action === 'add' ? 'AGREGAR (🟢 Blanca)' : action === 'ban' ? 'BLOQUEAR (🔴 Negra)' : 'ELIMINAR (🗑️)';
           await ctx.editMessageText(
             `📝 *Modo:* ${actionText}\n\n` +
             `Por favor, envía un mensaje de texto con el *Número de teléfono* o *ID del Grupo* que deseas afectar en la categoría de *${cat}*.\n\n` +
             `_(Escribe /cancelar para salir)_`,
             { parse_mode: "Markdown" }
           );
           await ctx.answerCallbackQuery();
        }
      } else if (data === "menu_auditoria") {
        try {
            const rows = await listAudits(10);
            if (!rows || rows.length === 0) return await ctx.reply("📊 No hay registros de auditoría aún.");
            const text = rows.map(r => {
                const details = r.details ? (r.details.length > 100 ? r.details.substring(0, 100) + '...' : r.details) : 'Sin detalles';
                const ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A';
                return `• [${ts}] *${r.action}*\n└ \`${details}\``;
            }).join("\n\n");
            await ctx.reply(`📊 *Últimas 10 Acciones:*\n\n${text}`, { parse_mode: "Markdown" });
        } catch(e: any) {
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
        await ctx.reply("⚙️ *Panel de Control PM2*\nSelecciona una acción:", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_actualizar") {
        const keyboard = new InlineKeyboard()
          .text("🔍 Buscar Actualización", "update_check").row()
          .text("⬆️ Aplicar Actualización", "update_apply");
        await ctx.reply("🔄 *Centro de Actualizaciones*\nVerifica si hay una nueva versión disponible en GitHub.", { reply_markup: keyboard, parse_mode: "Markdown" });
      } else if (data === "menu_tunel") {
        const { TunnelService } = await import("../core/tunnel");
        const tunnel = TunnelService.getInstance();
        const currentUrl = tunnel.getUrl();
        const statusText = currentUrl ? `🟢 *Túnel Activo*\n🔗 ${currentUrl}` : `🔴 *Túnel Inactivo*\nNo hay túnel en ejecución.`;
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
        const interfaces = os.networkInterfaces();
        let tailscaleIp = null;
        for (const ifaceList of Object.values(interfaces)) {
          if (!ifaceList) continue;
          for (const iface of ifaceList) {
            if (iface.family === 'IPv4' && iface.address.startsWith('100.')) {
              tailscaleIp = iface.address;
              break;
            }
          }
        }
        if (tailscaleIp) {
            const port = process.env.PORT || 8000;
            await ctx.reply(`🛡️ *Red Privada Activa (Tailscale)*\n\n🌐 *Enlace Directo:*\n\`http://${tailscaleIp}:${port}\``, { parse_mode: "Markdown" });
        } else {
            await ctx.reply(`🔴 *Tailscale Inactivo*\n\nNo se encontró una IP de red privada (100.x.x.x).`, { parse_mode: "Markdown" });
        }
      }
      return;
    }

    if (data === "sheets_sync") {
      await ctx.answerCallbackQuery({ text: "Sincronizando desde Sheets..." });
      const msg = await ctx.reply("⏳ Sincronizando con Google Sheets...");
      try {
          const { GoogleSheetsService } = await import("../modules/autoresponders/sheets.service");
          const sheetsService = new GoogleSheetsService();
          const result = await sheetsService.syncNow();
          
          if (result.success) {
             await ctx.api.editMessageText(ctx.chat!.id, msg.message_id, `✅ *Sincronización Exitosa*\n\n${result.message}`, { parse_mode: "Markdown" });
          } else {
             await ctx.api.editMessageText(ctx.chat!.id, msg.message_id, `❌ *Error en Sincronización*\n\n${result.message}`, { parse_mode: "Markdown" });
          }
      } catch (e: any) {
          await ctx.api.editMessageText(ctx.chat!.id, msg.message_id, `❌ *Error Crítico*\n\n${e.message}`, { parse_mode: "Markdown" });
      }
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

    if (data === "cancel_restore") {
      pendingRestores.delete(userId);
      await ctx.editMessageText("❌ *Restauración Cancelada*\n\nEl sistema no ha sufrido ningún cambio.", { parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === "confirm_restore") {
      const restoreData = pendingRestores.get(userId);
      if (!restoreData) {
        await ctx.editMessageText("❌ *Error:* No se encontró ninguna restauración pendiente o ha expirado.");
        await ctx.answerCallbackQuery();
        return;
      }
      
      pendingRestores.delete(userId);
      await ctx.editMessageText("⏳ *Procesando restauración...* Esto reemplazará todos tus datos y reiniciará el servidor.");
      await ctx.answerCallbackQuery();
      
      try {
          const file = await bot.api.getFile(restoreData.fileId);
          if (!file) throw new Error("No se pudo obtener el archivo de Telegram.");
          
          const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
          const basePath = BackupService.getBackupDir();
          const isEnc = restoreData.fileName.endsWith(".enc");
          const safeFileName = isEnc ? "restore_from_telegram.enc" : "restore_from_telegram.zip";
          const tempPath = path.join(basePath, safeFileName);
          
          const response = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
          const writer = createSecureWriteStream(tempPath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
          });

          const result = await BackupService.restoreBackup(tempPath);
          if (result.success) {
              await ctx.reply("✅ *Restauración Exitosa*\n\nEl sistema se apagará en 5 segundos.", { parse_mode: 'Markdown' });
              setTimeout(() => process.exit(0), 5000);
          } else {
              await ctx.reply("❌ *Error en la restauración:* " + result.message);
          }
          if (checkFileExists(tempPath)) deleteFile(tempPath);

      } catch (error: any) {
          await ctx.reply(`❌ *Error Crítico durante la restauración:*\n${error.message}`);
      }
      return;
    }

    if (data.startsWith("del_reminder_")) {
      const id = parseInt(data.replace("del_reminder_", ""));
      if (!isNaN(id)) {
        await deleteReminder(id);
        await ctx.answerCallbackQuery({ text: `✅ Recordatorio ${id} eliminado.`, show_alert: true });
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
      await ctx.reply("📲 ¡Vamos a crear un recordatorio paso a paso!\n\n¿Para quién es?\n_(Escribe el número de WhatsApp, Ej: 10 dígitos o 521XXXXXXXX. Usa comas para múltiples números)_", { parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
    } else if (data === "delete_reminder") {
      await ctx.reply("Para eliminar un recordatorio, usa el botón de 'Eliminar ID' en la lista de 'Ver Activos', o usa el comando: `/delreminder ID`", { parse_mode: "Markdown" });
      await ctx.answerCallbackQuery();
    }

    if (data.startsWith("pm2_")) {
      const action = data.replace("pm2_", "");
      await ctx.answerCallbackQuery({ text: "Procesando comando PM2..." });
      const isUnderPM2 = process.env.pm_id !== undefined || process.env.PM2_HOME !== undefined;
      const appName = "BotMaRe-Unified";

      if (!isUnderPM2 && action !== 'status') {
         return await ctx.reply("⚠️ *Aviso de Entorno*\n\nEl sistema no parece estar corriendo bajo *PM2*.", { parse_mode: "Markdown" });
      }

      try {
        switch (action) {
          case "status":
            try {
                const { stdout: statusOut } = await execAsync(`pm2 status ${appName} --no-color`);
                return await ctx.reply(`📊 *Estado de PM2:*\n\`\`\`\n${statusOut}\n\`\`\``, { parse_mode: "Markdown" });
            } catch (e) {
                return await ctx.reply("❌ *PM2 no disponible*");
            }
          case "restart":
            await ctx.reply("🔄 Reiniciando el proceso... La conexión se perderá por unos segundos.");
            setTimeout(async () => { try { await execAsync(`pm2 restart ${appName}`); } catch (e) {} }, 1000);
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
            const keyboard = new InlineKeyboard().text("⬆️ Aplicar Actualización Ahora", "update_apply");
            await ctx.reply(
              `🆕 *¡Actualización Disponible!*\n\n` +
              `📌 Versión local: \`${result.currentVersion}\`\n` +
              `🔸 Commit remoto: \`${result.remoteCommit}\`\n\n` +
              `¿Deseas aplicarla?`,
              { reply_markup: keyboard, parse_mode: "Markdown" }
            );
          } else {
            await ctx.reply(`✅ *Sistema al día*\n\nVersión: \`${result.currentVersion}\``, { parse_mode: "Markdown" });
          }
        } else if (action === "apply") {
          await ctx.reply("⏳ *Aplicando actualización...*", { parse_mode: "Markdown" });
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

    if (data.startsWith("tunnel_")) {
      const action = data.replace("tunnel_", "");
      await ctx.answerCallbackQuery({ text: "Procesando..." });
      try {
        const { TunnelService } = await import("../core/tunnel");
        const tunnel = TunnelService.getInstance();
        const PORT = process.env.PORT || 8000;
        if (action === "restart") {
          await ctx.reply("🔄 *Reiniciando túnel...*", { parse_mode: "Markdown" });
          tunnel.stop();
          const newUrl = await tunnel.start(Number(PORT));
          await ctx.reply(`✅ *Túnel Reiniciado*\n\n🔗 Nueva URL: ${newUrl}`, { parse_mode: "Markdown" });
        } else if (action === "stop") {
          tunnel.stop();
          await ctx.reply("⏹️ *Túnel Detenido*", { parse_mode: "Markdown" });
        }
      } catch (error: any) {
        await ctx.reply(`❌ *Error:* ${error.message}`, { parse_mode: "Markdown" });
      }
      return;
    }

    if (data.startsWith("ssh_")) {
      const action = data.replace("ssh_", "");
      await ctx.answerCallbackQuery({ text: "Procesando..." });
      try {
        if (action === "start") {
          try {
            await execAsync('command -v tmate || which tmate');
          } catch {
            return await ctx.reply("⚠️ *tmate no está instalado*", { parse_mode: "Markdown" });
          }
          await ctx.reply("⏳ Generando sesión SSH segura...", { parse_mode: "Markdown" });
          try {
            await execAsync('tmate -S /tmp/tmate.sock new-session -d');
            await execAsync('tmate -S /tmp/tmate.sock wait tmate-ready');
            const { stdout } = await execAsync("tmate -S /tmp/tmate.sock display -p '#{tmate_ssh}'");
            const sshCommand = stdout.trim();
            if (sshCommand) {
              const keyboard = new InlineKeyboard().text("⏹️ Detener Sesión Segura", "ssh_stop");
              await ctx.reply(`✅ *Sesión SSH Activa*\n\n\`${sshCommand}\``, { reply_markup: keyboard, parse_mode: "Markdown" });
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
}
