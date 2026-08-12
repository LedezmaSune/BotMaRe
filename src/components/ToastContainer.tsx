'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, ExternalLink } from 'lucide-react';
import { NotificationItem } from '../hooks/useNotifications';
import Link from 'next/link';

interface ToastContainerProps {
    toasts: NotificationItem[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    const getIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />;
            case 'warning':
                return <AlertTriangle className="text-amber-400 shrink-0" size={20} />;
            case 'error':
                return <AlertCircle className="text-rose-400 shrink-0" size={20} />;
            default:
                return <Info className="text-cyan-400 shrink-0" size={20} />;
        }
    };

    const getBorderColor = (type: NotificationItem['type']) => {
        switch (type) {
            case 'success': return 'border-emerald-500/30 bg-emerald-950/40';
            case 'warning': return 'border-amber-500/30 bg-amber-950/40';
            case 'error': return 'border-rose-500/30 bg-rose-950/40';
            default: return 'border-cyan-500/30 bg-cyan-950/40';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: -10 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                        exit={{ opacity: 0, x: 100, scale: 0.85, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className={`pointer-events-auto backdrop-blur-xl border rounded-2xl p-4 shadow-2xl shadow-black/50 flex flex-col gap-2 ${getBorderColor(toast.type)}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="mt-0.5">{getIcon(toast.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-white tracking-wide truncate">{toast.title}</h4>
                                    <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">{toast.message}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onClose(toast.id)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {toast.link && (
                            <div className="pt-1 flex justify-end">
                                <Link
                                    href={toast.link}
                                    onClick={() => onClose(toast.id)}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                                >
                                    Ver detalles <ExternalLink size={11} />
                                </Link>
                            </div>
                        )}

                        {/* Barra de progreso de auto-descarte */}
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 5, ease: 'linear' }}
                            onAnimationComplete={() => onClose(toast.id)}
                            className="h-0.5 bg-white/20 rounded-full overflow-hidden mt-1"
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
