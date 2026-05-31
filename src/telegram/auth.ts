import { Context } from "grammy";
import type { NextFunction } from "grammy";

export async function authMiddleware(ctx: Context, next: NextFunction) {
  if (!ctx.from) return;
  const userId = ctx.from.id.toString();

  const adminId = process.env.TELEGRAM_ALLOWED_USER_IDS;

  // REFUERZO DE SEGURIDAD CRÍTICA:
  // Si la variable no está configurada o está vacía, bloqueamos por defecto para evitar brechas de seguridad.
  if (!adminId || adminId.trim() === '') {
    console.error(`[Telegram Auth] CRÍTICO: La variable TELEGRAM_ALLOWED_USER_IDS no está configurada. Acceso al bot de Telegram totalmente bloqueado.`);
    await ctx.reply(
      `⚠️ *Acceso Bloqueado por Seguridad*\n\n` +
      `El panel administrativo de Telegram está desactivado porque no se ha configurado la variable \`TELEGRAM_ALLOWED_USER_IDS\` en el archivo \`.env\`.\n\n` +
      `🔑 *Tu ID de Telegram:* \`${userId}\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const allowedIds = adminId.split(',').map(id => id.trim()).filter(Boolean);

  if (!allowedIds.includes(userId)) {
    console.warn(`[Telegram Auth] Acceso denegado para el ID: ${userId}. Solo administradores autorizados.`);
    await ctx.reply(
      `⛔ *Acceso Restringido*\n\n` +
      `Este asistente maestro es de uso estrictamente privado.\n\n` +
      `🔑 *Tu ID de Telegram:* \`${userId}\`\n\n` +
      `_Si eres el propietario, añade este ID a la lista de \`TELEGRAM_ALLOWED_USER_IDS\` en tu archivo \`.env\`._`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  await next();
}
