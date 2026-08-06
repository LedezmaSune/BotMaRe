import { Bot, InlineKeyboard } from "grammy";
import { MessageService as WhatsAppService } from "../modules/messages/message.service";
import { MassDiffusionService } from "../modules/messages/diffusion.service";
import { getSettings, updateSettings, listAudits, deleteReminder } from "../core/memory";
import { getConfig } from "../core/config";
import { BackupService } from "../modules/system/backup.service";
import { wizardState } from "./state";
import os from "os";

export function registerCommands(bot: Bot, waService: WhatsAppService, diffusionService: MassDiffusionService) {
  bot.api.setMyCommands([
    { command: "start", description: "🦊 Iniciar y ver panel" },
    { command: "dashboard", description: "🌌 Ver panel de control web" },
    { command: "recordatorios", description: "📅 Gestión de recordatorios" },
    { command: "masivo", description: "📣 Enviar difusión masiva" },
    { command: "detenermasivo", description: "🚨 Cancelar difusión masiva activa" },
    { command: "cerebro", description: "🧠 Ver configuración del bot" },
    { command: "lista", description: "🛡️ Control de listas (Whitelist/Blacklist)" },
    { command: "auditoria", description: "📊 Ver últimos 10 movimientos" },
    { command: "notificaciones", description: "🔔 Alternar notificaciones (ON/OFF)" },
    { command: "actualizar", description: "🔄 Buscar y aplicar actualizaciones" },
    { command: "tunel", description: "🌐 Estado o reinicio del túnel Cloudflare" },
    { command: "ssh", description: "🧑‍💻 Acceso SSH reverso (tmate)" },
    { command: "tailscale", description: "🛡️ Red privada Tailscale" },
    { command: "pm2", description: "⚙️ Control de procesos PM2" },
    { command: "borrarmemorial", description: "🧹 Borrar memoria del bot" },
    { command: "setadmin", description: "👑 Añadir número admin de WhatsApp" },
    { command: "backup", description: "📦 Generar respaldo manual (ZIP)" },
    { command: "ayuda", description: "❓ Ver la guía de comandos" },
  ]).catch(console.error);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🌌 Panel Web", "menu_dashboard")
      .text("📱 WhatsApp", "menu_status").row()
      .text("📅 Recordatorios", "menu_reminders")
      .text("📣 Difusión Masiva", "menu_masivo").row()
      .text("🧠 Cerebro IA", "menu_cerebro")
      .text("📊 Google Sheets", "menu_sheets").row()
      .text("🛡️ Listas de Acceso", "menu_lista")
      .text("📋 Auditoría", "menu_auditoria").row()
      .text("🔔 Notificaciones", "menu_notificaciones").row()
      .text("🔄 Actualizar", "menu_actualizar").row()
      .text("🌐 Cloudflare", "menu_tunel")
      .text("🛡️ Tailscale IP", "menu_tailscale").row()
      .text("🧑‍💻 Acceso SSH", "menu_ssh")
      .text("⚙️ Control PM2", "menu_pm2");
    
    const brandName = process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe';
    await ctx.reply(
      `🦊 *¡Bienvenido al Asistente Maestro de ${brandName}!*\n\n` +
      `Desde aquí puedes supervisar, configurar y controlar toda la plataforma de automatización de WhatsApp de forma remota y segura.\n\n` +
      `👇 *Selecciona una opción para comenzar:*`,
      { reply_markup: keyboard, parse_mode: "Markdown" }
    );
  });

  bot.command("backup", async (ctx) => {
    const adminId = ctx.from?.id.toString();
    if (!adminId) return;
    
    await ctx.reply("⏳ Generando archivos de respaldo encriptados, por favor espera...");
    try {
        await BackupService.createBackup(true);
        await ctx.reply("✅ Respaldo generado y enviado con éxito.");
    } catch (e) {
        await ctx.reply("⚠️ Hubo un problema al generar el respaldo.");
    }
  });

  bot.command("lista", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("👤 Administrar Contactos", "lista_cat_contactos").row()
      .text("👥 Administrar Grupos", "lista_cat_grupos").row();

    await ctx.reply(
        `🛡️ *Control de Listas de Acceso*\n\n` +
        `Selecciona la categoría que deseas configurar:`,
        { reply_markup: keyboard, parse_mode: "Markdown" }
    );
  });

  bot.command(["ayuda", "comandos", "help"], async (ctx) => {
    const guide = `🦊 *Guía de Comandos y Uso de BotMaRe*\n\n` +
      `¡Hola! Soy tu asistente maestro. Puedes conversar conmigo de forma natural para pedirme cosas, enviarme audios, o usar los siguientes comandos rápidos:\n\n` +
      `*Comandos Principales:*\n` +
      `👉 /start - Abre el menú principal con botones.\n` +
      `👉 /ayuda - Muestra esta guía de comandos.\n` +
      `👉 /dashboard - Obtener link de acceso al Panel Web.\n` +
      `👉 /recordatorios - Gestionar o ver tus recordatorios.\n` +
      `👉 /masivo - Iniciar una campaña de difusión por WhatsApp.\n` +
      `👉 /detenermasivo - Cancelar una difusión en curso.\n` +
      `👉 /cerebro - Ajustar parámetros de la IA y reglas.\n` +
      `👉 /lista - Administrar listas blancas y negras.\n` +
      `👉 /auditoria - Ver últimos movimientos y errores.\n` +
      `👉 /notificaciones - Activar/desactivar alertas en Telegram.\n\n` +
      `*Mantenimiento y Servidor:*\n` +
      `👉 /actualizar - Buscar nuevas versiones en GitHub.\n` +
      `👉 /tunel - Ver o reiniciar la URL pública (Cloudflare).\n` +
      `👉 /ssh - Abrir terminal remota (Tmate) para soporte.\n` +
      `👉 /tailscale - Ver estado de red privada VPN.\n` +
      `👉 /pm2 - Controlar los procesos en segundo plano.\n` +
      `👉 /borrarmemorial - Limpiar mi memoria conversacional.\n\n` +
      `💡 *Tip:* Si estás desde el celular, simplemente escribe "/" en el chat para que Telegram te despliegue la lista automática de comandos interactivos.`;
    
    await ctx.reply(guide, { parse_mode: "Markdown" });
  });

  bot.command("setadmin", async (ctx) => {
    const args = ctx.match;
    if (!args) {
        return ctx.reply("❌ Error. Debes especificar el número. Ejemplo:\n`/setadmin 4821024749`\n`/setadmin 49658596425808@lid`", { parse_mode: "Markdown" });
    }
    const newAdmin = args.trim().split('@')[0];
    
    const currentConfig = await getConfig('WHATSAPP_OWNER_NUMBER', '');
    let admins = currentConfig ? currentConfig.split(',').map((n: string) => n.trim()) : [];
    
    if (admins.includes(newAdmin)) {
        return ctx.reply(`⚠️ El número \`${newAdmin}\` ya es administrador.`, { parse_mode: "Markdown" });
    }
    
    admins.push(newAdmin);
    const newConfigStr = admins.join(',');
    
    await updateSettings({ WHATSAPP_OWNER_NUMBER: newConfigStr });
    
    await ctx.reply(
        `✅ *Administrador Agregado*\n\n` +
        `El número \`${newAdmin}\` ahora tiene permisos totales para usar \`!lista\` en WhatsApp.\n\n` +
        `_Lista actual de admins:_ \n\`${newConfigStr}\``,
        { parse_mode: "Markdown" }
    );
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

  bot.command("detenermasivo", async (ctx) => {
    const stopped = diffusionService.stopProcessing();
    if (stopped) {
      await ctx.reply("🚨 *Deteniendo Campaña...*\n\nSe ha solicitado la cancelación del envío masivo en curso. El bot detendrá la cola después de terminar el mensaje actual.", { parse_mode: "Markdown" });
    } else {
      await ctx.reply("ℹ️ *Sin Actividad*\n\nNo hay ninguna campaña de difusión masiva activa en este momento.", { parse_mode: "Markdown" });
    }
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
        const rows = await listAudits(10);
        if (!rows || rows.length === 0) return await ctx.reply("📊 No hay registros de auditoría aún.");

        const text = rows.map(r => {
            let details = r.details;
            try {
                if (typeof details === 'string' && details.startsWith('{')) {
                    const parsed = JSON.parse(details);
                    details = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
                } else if (typeof details === 'object' && details !== null) {
                    details = Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ');
                }
            } catch(e) {}
            
            details = details ? (details.length > 150 ? details.substring(0, 150) + '...' : details) : 'Sin detalles';
            const ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A';
            return `• [${ts}] *${r.action}*\n└ \`${details}\``;
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
}
