'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Bell, Brain, Megaphone, CalendarDays, Layout as LayoutIcon, Settings as SettingsIcon, Menu, X, Trash2, Users, BookOpen, ShieldAlert, RefreshCw } from 'lucide-react';

import { ConnectionOverlay } from '@/components/ConnectionOverlay';
import { ThemeToggle, UpdateChecker, AIToggle, GlobalClock } from '@/components/StatusHeader';
import { PageTransition } from '@/components/PageTransition';
import { siteConfig } from '@/config';
import { useGlobalBotData } from '@/app/BotDataProvider';
import { TabId } from '@/hooks/useBotData';

const routes: Array<{ path: string; icon: any; label: string; id: TabId }> = [
    { path: '/', icon: Megaphone, label: 'Difusión', id: 'mass' },
    { path: '/scheduling', icon: Bell, label: 'Recordatorios', id: 'scheduling' },
    { path: '/calendar', icon: CalendarDays, label: 'Calendario', id: 'calendar' },
    { path: '/templates', icon: LayoutIcon, label: 'Plantillas', id: 'templates' },
    { path: '/autoresponders', icon: Menu, label: 'Menús Rápidos', id: 'autoresponders' as TabId },
    { path: '/groups', icon: Users, label: 'Grupos', id: 'groups' },
    { path: '/personality', icon: Brain, label: 'Cerebro IA', id: 'personality' },
    { path: '/support', icon: ShieldAlert, label: 'Soporte', id: 'support' as TabId },
    { path: '/settings', icon: SettingsIcon, label: 'Configuración', id: 'settings' },
    { path: '/audits', icon: History, label: 'Auditoría', id: 'audits' },
    { path: '/updates', icon: RefreshCw, label: 'Actualizaciones', id: 'updates' as TabId },
    { path: '/manual', icon: BookOpen, label: 'Manual de Uso', id: 'manual' as TabId }
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { status, qr, pairingCode, handleRequestPairingCode, settings, handleCleanUploads, setActiveTab } = useGlobalBotData();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const handleTabChange = (id: TabId) => {
        setActiveTab(id);
        setIsMenuOpen(false);
    };

    // Sincronizar el estado del Tab con la URL al cargar o cambiar de ruta
    useEffect(() => {
        const currentRoute = routes.find(r => 
            pathname === r.path || (pathname.startsWith(r.path) && r.path !== '/')
        );
        if (currentRoute) {
            setActiveTab(currentRoute.id);
        }
    }, [pathname, setActiveTab]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-cyan-500/30 transition-colors duration-300">
            <ConnectionOverlay qr={qr} pairingCode={pairingCode} onRequestPairingCode={handleRequestPairingCode} status={status} />

            {/* Fondos Decorativos Animados */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-cyan-500/15 dark:bg-cyan-500/10 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-fuchsia-600/15 dark:bg-purple-600/15 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
            </div>

            {/* --- HEADER SUPERIOR COMPACTO --- */}
            <header className="fixed top-0 left-0 w-full z-[100] premium-glass border-b-0 border-app-border/30 px-4 md:px-8 py-3 flex items-center justify-between shadow-[0_4px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsMenuOpen(true)}
                        className="p-2.5 hover:bg-app-card/60 rounded-xl border border-app-border transition-all active:scale-95 group shadow-inner"
                    >
                        <Menu size={20} className="text-app-text group-hover:text-cyan-500 transition-colors" />
                    </button>
                    
                    <div className="flex items-center gap-3 ml-1">
                        <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 rotate-3">
                            <span className="text-white text-lg font-black italic">{siteConfig.name.charAt(0)}</span>
                        </div>
                        <div className="flex flex-col -space-y-1">
                            <span className="font-black text-sm tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{siteConfig.name}</span>
                            <span className="text-[8px] font-bold text-app-text-muted uppercase tracking-[0.2em] opacity-50">{settings?.bot_name || 'Bot'}</span>
                        </div>
                    </div>
                </div>

                {/* Clock en medio de la barra superior (oculto en móviles muy pequeños) */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <GlobalClock />
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:flex items-center gap-1 bg-app-card/40 p-1 rounded-xl border border-app-border/50">
                        <AIToggle />
                        <div className="w-px h-4 bg-app-border/50 mx-1"></div>
                        <ThemeToggle />
                        <UpdateChecker />
                        <button 
                            onClick={handleCleanUploads}
                            title="Limpiar temporales"
                            className="p-2 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest bg-app-card/50 ${
                        status === 'connected' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400 animate-pulse'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                        <span className="hidden xs:inline">{status}</span>
                    </div>
                </div>
            </header>

            {/* --- MENÚ LATERAL (DRAWER) CON FRAMER MOTION --- */}
            <AnimatePresence>
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[200]">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        
                        <motion.nav 
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute top-0 left-0 h-full w-72 md:w-80 premium-glass border-r border-app-border/30 shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b border-app-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-lg font-black italic">{siteConfig.name.charAt(0)}</span>
                                    </div>
                                    <span className="font-black text-xl tracking-tighter">{siteConfig.name}</span>
                                </div>
                                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all active:scale-90">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                                {routes.map((route, i) => {
                                    const isActive = pathname === route.path || (pathname.startsWith(route.path) && route.path !== '/');
                                    return (
                                        <motion.div
                                            key={route.path}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04, ease: "easeOut" }}
                                        >
                                            <Link
                                                href={route.path}
                                                onClick={() => handleTabChange(route.id)}
                                                className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 relative group overflow-hidden ${
                                                    isActive
                                                        ? 'text-white shadow-[0_0_20px_var(--app-glow)] scale-[1.02]'
                                                        : 'text-app-text-muted hover:text-app-text hover:bg-app-card'
                                                }`}
                                            >
                                                {isActive && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--app-accent)] to-blue-600 opacity-90 z-0 glow-border"></div>
                                                )}
                                                <div className="relative z-10 flex items-center gap-4">
                                                    <route.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                                    <span>{route.label}</span>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="p-6 border-t border-app-border opacity-30 text-[8px] font-bold uppercase tracking-widest text-center">
                                Kitsune Engine K 1.2.0
                            </div>
                        </motion.nav>
                    </div>
                )}
            </AnimatePresence>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <main className="relative z-10 pt-24 pb-4 px-4 sm:pt-28 sm:pb-8 sm:px-8 md:pt-32 md:pb-12 md:px-12 max-w-[1400px] mx-auto w-full min-h-screen flex flex-col">
                <PageTransition>
                    {children}
                </PageTransition>

                {/* Footer / Status Bar */}
                <footer className="mt-20 py-10 border-t border-app-border mt-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest">
                                {siteConfig.name} System Active
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">K 1.3.0</span>
                            </div>
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Estable</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-app-text-muted font-bold uppercase tracking-widest">
                            &copy; {new Date().getFullYear()} {siteConfig.name}. Powered by Kitsune Engine.
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
