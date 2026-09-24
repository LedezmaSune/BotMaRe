'use client';

import { motion } from 'framer-motion';
import { 
    Radio, 
    Send, 
    MessageSquare, 
    Globe, 
    Smartphone, 
    CheckCircle2, 
    Sparkles,
    ShieldCheck
} from 'lucide-react';

function InstagramIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
    );
}

function FacebookIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
    );
}

interface ChannelCardProps {
    name: string;
    description: string;
    icon: any;
    color: string;
    badge: string;
    badgeColor: string;
    features: string[];
    progress: number;
}

const channels: ChannelCardProps[] = [
    {
        name: 'WhatsApp Web & API Multi-Dispositivo',
        description: 'Conexión activa mediante motor Baileys con soporte QR y Código de emparejamiento de 8 dígitos.',
        icon: Smartphone,
        color: 'from-emerald-500 to-teal-600',
        badge: 'Activo',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        features: ['Difusión masiva con delay anti-ban', 'Respuestas automáticas inteligentes', 'Soporte de audio, imágenes y archivos', 'Integración con Cerebro IA'],
        progress: 100
    },
    {
        name: 'Telegram Bot (Admin & Broadcast)',
        description: 'Control remoto del sistema para administradores y canal público para difusión masiva a usuarios.',
        icon: ShieldCheck,
        color: 'from-sky-500 to-blue-600',
        badge: 'Híbrido',
        badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        features: ['Control absoluto del panel', 'Broadcast masivo a canales y grupos', 'Botones interactivos para usuarios', 'Alertas y notificaciones del sistema'],
        progress: 80
    },
    {
        name: 'Instagram Direct Messages',
        description: 'Auto-respuestas para mensajes directos e interacciones con historias de Instagram.',
        icon: InstagramIcon,
        color: 'from-fuchsia-500 to-pink-600',
        badge: 'Próximamente',
        badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
        features: ['Respuesta a menciones en Stories', 'Flujo de ventas por DM', 'Captura de Leads directamente a CRM', 'IA conversacional para eCommerce'],
        progress: 45
    },
    {
        name: 'Facebook Messenger',
        description: 'Integración oficial con Fanpages de Facebook para mensajería automatizada.',
        icon: FacebookIcon,
        color: 'from-blue-600 to-indigo-700',
        badge: 'Próximamente',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        features: ['Plantillas con botones interactivos', 'Filtro automático de comentarios a Inbox', 'Derivación a soporte humano', 'Sincronización con catálogo de productos'],
        progress: 30
    }
];

export function FutureChannelsUI() {
    return (
        <div className="space-y-8 pb-12">
            {/* Header / Hero Section */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden p-6 md:p-8 rounded-3xl premium-glass border border-app-border/40 shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-widest">
                            <Radio size={14} className="animate-pulse" />
                            <span>Roadmap Omnicanal BotMaRe AI</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                            Futuros Canales de Comunicación
                        </h1>
                        <p className="text-sm md:text-base text-app-text-muted leading-relaxed">
                            Estamos expandiendo la infraestructura de BotMaRe para convertirlo en un hub omnicanal unificado. Muy pronto podrás gestionar WhatsApp, Telegram, Instagram, Facebook y tu sitio Web desde esta misma plataforma.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="p-4 rounded-2xl bg-app-card/60 border border-app-border/50 text-center min-w-[120px]">
                            <span className="block text-2xl font-black text-emerald-400">1</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted">Canal Activo</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-app-card/60 border border-app-border/50 text-center min-w-[120px]">
                            <span className="block text-2xl font-black text-cyan-400">5</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted">En Hoja de Ruta</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Grid de Canales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel, index) => {
                    const Icon = channel.icon;
                    return (
                        <motion.div
                            key={channel.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-app-card/50 hover:bg-app-card/80 border border-app-border/50 hover:border-cyan-500/40 transition-all duration-300 shadow-lg hover:shadow-cyan-500/10"
                        >
                            <div className="space-y-4">
                                {/* Encabezado de la Tarjeta */}
                                <div className="flex items-center justify-between">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${channel.color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                        <Icon size={24} />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${channel.badgeColor}`}>
                                        {channel.badge}
                                    </span>
                                </div>

                                {/* Título y Descripción */}
                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                                        {channel.name}
                                    </h3>
                                    <p className="text-xs text-app-text-muted leading-relaxed">
                                        {channel.description}
                                    </p>
                                </div>

                                {/* Lista de Capacidades */}
                                <div className="pt-2 space-y-2 border-t border-app-border/30">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted opacity-70 block mb-2">
                                        Capacidades Integradas:
                                    </span>
                                    {channel.features.map((feat, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-app-text-subtle">
                                            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Barra de Progreso */}
                            <div className="pt-6 mt-4 border-t border-app-border/30 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-app-text-muted">Avance de integración</span>
                                    <span className="text-cyan-400 font-mono">{channel.progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-app-card rounded-full overflow-hidden p-0.5 border border-app-border/40">
                                    <div 
                                        className={`h-full rounded-full bg-gradient-to-r ${channel.color} transition-all duration-1000`}
                                        style={{ width: `${channel.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Banner Informativo Bottom */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 shrink-0">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">¿Tienes sugerencias para un canal específico?</h4>
                        <p className="text-xs text-app-text-muted">Cada canal compartirá el mismo Cerebro IA, plantillas de mensajes y base de datos centralizada de BotMaRe.</p>
                    </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold whitespace-nowrap">
                    Próximo Release: v2.6.0
                </div>
            </motion.div>
        </div>
    );
}
