'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, 
    Volume2, 
    VolumeX, 
    CheckCheck, 
    Trash2, 
    ExternalLink, 
    Monitor, 
    ShieldAlert, 
    Megaphone, 
    Smartphone, 
    CheckCircle2, 
    AlertTriangle, 
    AlertCircle, 
    Info,
    X,
    Sparkles
} from 'lucide-react';
import { useNotifications, NotificationItem } from '../hooks/useNotifications';
import { ToastContainer } from './ToastContainer';
import Link from 'next/link';

export function NotificationCenter() {
    const {
        notifications,
        unreadCount,
        toasts,
        removeToast,
        markAsRead,
        markAllAsRead,
        clearAll,
        soundEnabled,
        toggleSound,
        desktopPermission,
        requestDesktopPermission
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getIcon = (notif: NotificationItem) => {
        if (notif.source === 'handoff') return <ShieldAlert className="text-amber-400" size={16} />;
        if (notif.source === 'diffusion') return <Megaphone className="text-cyan-400" size={16} />;
        if (notif.source === 'whatsapp') return <Smartphone className="text-emerald-400" size={16} />;

        switch (notif.type) {
            case 'success': return <CheckCircle2 className="text-emerald-400" size={16} />;
            case 'warning': return <AlertTriangle className="text-amber-400" size={16} />;
            case 'error': return <AlertCircle className="text-rose-400" size={16} />;
            default: return <Info className="text-cyan-400" size={16} />;
        }
    };

    const formatRelativeTime = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        return new Date(timestamp).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredNotifications = filter === 'unread' 
        ? notifications.filter(n => !n.read) 
        : notifications;

    return (
        <>
            <div className="relative" ref={containerRef}>
                {/* Botón de la Campana en el Header */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen && unreadCount > 0) {
                            markAllAsRead();
                        }
                    }}
                    className={`relative p-2.5 rounded-xl border transition-all duration-300 ${
                        isOpen 
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                            : 'bg-app-card/60 hover:bg-app-card border-app-border text-app-text hover:text-cyan-400'
                    }`}
                    title="Centro de Notificaciones"
                >
                    <Bell size={18} className={unreadCount > 0 ? 'animate-bounce text-cyan-400' : ''} />
                    
                    {/* Badge contador */}
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 border border-white/20"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Panel Flotante Desplegable (Flyout Glassmorphism) */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                            className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-3xl premium-glass border border-app-border shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl z-[150] overflow-hidden flex flex-col"
                        >
                            {/* Cabecera del Panel */}
                            <div className="p-4 border-b border-app-border/40 bg-app-card/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <Bell size={15} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-white">Notificaciones</h3>
                                        <p className="text-[10px] text-app-text-muted">Avisos del sistema en tiempo real</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleSound}
                                        title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                                        className={`p-1.5 rounded-lg border transition-all ${
                                            soundEnabled 
                                                ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' 
                                                : 'text-slate-400 bg-slate-800/40 border-slate-700/50'
                                        }`}
                                    >
                                        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                    </button>

                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            title="Limpiar todo el historial"
                                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Banner de Permiso para Notificaciones de Windows/Navegador */}
                            {desktopPermission !== 'granted' && (
                                <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border-b border-cyan-500/20 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-cyan-300">
                                        <Monitor size={14} className="shrink-0" />
                                        <span className="text-[10px] font-medium leading-tight">¿Activar avisos de escritorio en Windows?</span>
                                    </div>
                                    <button
                                        onClick={requestDesktopPermission}
                                        className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-black rounded-lg transition-all active:scale-95 shadow-md shadow-cyan-500/30 shrink-0"
                                    >
                                        Activar
                                    </button>
                                </div>
                            )}

                            {/* Selector de Filtros */}
                            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 bg-app-card/60 p-0.5 rounded-xl border border-app-border/40 text-[10px] font-bold">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-3 py-1 rounded-lg transition-all ${
                                            filter === 'all' 
                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                                : 'text-app-text-muted hover:text-white'
                                        }`}
                                    >
                                        Todas ({notifications.length})
                                    </button>
                                    <button
                                        onClick={() => setFilter('unread')}
                                        className={`px-3 py-1 rounded-lg transition-all ${
                                            filter === 'unread' 
                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                                : 'text-app-text-muted hover:text-white'
                                        }`}
                                    >
                                        Sin leer ({unreadCount})
                                    </button>
                                </div>

                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[10px] font-bold text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                                    >
                                        <CheckCheck size={12} /> Leídas
                                    </button>
                                )}
                            </div>

                            {/* Lista de Notificaciones */}
                            <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                                {filteredNotifications.length === 0 ? (
                                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 rounded-2xl bg-app-card/40 border border-app-border/40 flex items-center justify-center text-slate-500 mb-3">
                                            <Sparkles size={22} className="opacity-40" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-300">Bandeja despejada</p>
                                        <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                                            No hay notificaciones {filter === 'unread' ? 'sin leer' : 'registradas'} por ahora.
                                        </p>
                                    </div>
                                ) : (
                                    filteredNotifications.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={() => markAsRead(item.id)}
                                            className={`group p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                                item.read 
                                                    ? 'bg-app-card/20 hover:bg-app-card/40 border-app-border/20 opacity-70 hover:opacity-100' 
                                                    : 'bg-gradient-to-r from-cyan-950/30 to-blue-950/20 hover:from-cyan-950/50 hover:to-blue-950/40 border-cyan-500/30 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-app-card/60 border border-app-border/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                                                    {getIcon(item)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className={`text-xs font-bold truncate ${item.read ? 'text-slate-300' : 'text-white'}`}>
                                                            {item.title}
                                                        </h4>
                                                        <span className="text-[9px] text-slate-500 shrink-0 font-medium">
                                                            {formatRelativeTime(item.timestamp)}
                                                        </span>
                                                    </div>

                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                                        {item.message}
                                                    </p>

                                                    {item.link && (
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <Link
                                                                href={item.link}
                                                                onClick={() => setIsOpen(false)}
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                                                            >
                                                                Ir a la sección <ExternalLink size={10} />
                                                            </Link>

                                                            {!item.read && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Toasts flotantes automáticos en pantalla */}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </>
    );
}
