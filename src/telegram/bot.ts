import { Bot } from "grammy";
import { authMiddleware } from "./auth";
import { MessageService as WhatsAppService } from "../modules/messages/message.service";
import { ReminderService } from "../modules/reminders/reminder.service";
import { MassDiffusionService } from "../modules/messages/diffusion.service";
import { NotificationService } from "./notification.service";
import { globalEvents, EVENTS } from "../core/events";
import { registerCommands } from "./commands";
import { registerCallbacks } from "./callbacks";
import { registerWizards } from "./wizards";

type TelegramBot = Bot & { ownerId: string };

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
  
  // Middleware de Autenticación
  bot.use(authMiddleware);

  // ── REFUERZO: Monitoreo en Tiempo Real de Campañas Masivas ─────────────────────────
  let lastNotifiedPercentage = -1;
  
  globalEvents.on(EVENTS.DIFFUSION_PROGRESS, async (prog: { current: number, total: number, percentage: number }) => {
    const pct = prog.percentage;
    if (pct % 25 === 0 && pct !== lastNotifiedPercentage && pct > 0 && pct < 100) {
      lastNotifiedPercentage = pct;
      const progressBars = "▓".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
      await NotificationService.notifyAdmin(
        `📊 *Progreso de Difusión Masiva*\n\n` +
        `Progreso: \`[${progressBars}]\` *${pct}%*\n` +
        `Enviados: *${prog.current}* de *${prog.total}* contactos.\n\n` +
        `🛑 _Para detener la campaña en cualquier momento, usa el comando /detenermasivo._`
      );
    }
  });

  globalEvents.on(EVENTS.DIFFUSION_COMPLETED, async (data: { total: number, success: number }) => {
    lastNotifiedPercentage = -1;
    const failed = data.total - data.success;
    await NotificationService.notifyAdmin(
      `✅ *Campaña de Difusión Finalizada*\n\n` +
      `📊 *Resumen de Envío:*\n` +
      `• Total Contactos: *${data.total}*\n` +
      `• Envíos Exitosos: *🟢 ${data.success}*\n` +
      `• Envíos Fallidos: *🔴 ${failed}*\n\n` +
      `✨ _La campaña ha sido procesada por completo._`
    );
  });

  // ── REGISTRO DE MÓDULOS ────────────────────────────────────────────────────────────
  registerCommands(bot, waService, diffusionService);
  registerCallbacks(bot, waService);
  registerWizards(bot, diffusionService);

  // ── INICIALIZACIÓN ─────────────────────────────────────────────────────────────────
  bot.catch((err) => console.error("[Grammy Error]", err));

  bot.start({
    onStart: (botInfo) => {
      console.log(`[Telegram] Bot iniciado como @${botInfo.username}`);
    }
  });
}
