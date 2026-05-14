export const siteConfig = {
    name: process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || "BotMaRe",
    title: process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || "BotMaRe",
    description: "Plataforma Unificada de WhatsApp con Inteligencia Artificial",
    connectionText: "Escanea el código QR con tu WhatsApp para vincular el bot",
    aiPlaceholder: "Escribe un mensaje para que la IA lo revise...",
    links: {
      github: "https://github.com/LedezmaSune/BotMaRe",
    },
};

export type SiteConfig = typeof siteConfig;
