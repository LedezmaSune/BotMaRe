import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Trash2, Paperclip } from 'lucide-react';
import { Reminder } from '../../types';

interface HistoryListProps {
    reminders: Reminder[];
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    historyPage: number;
    setHistoryPage: (page: number | ((p: number) => number)) => void;
    onDelete: (id: number) => void;
}

export function HistoryList({
    reminders,
    viewMode,
    setViewMode,
    historyPage,
    setHistoryPage,
    onDelete
}: HistoryListProps) {
    const ITEMS_PER_PAGE = 8;
    const historyItems = reminders.filter(r => r.status === 'sent').sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const totalHistoryPages = Math.ceil(historyItems.length / ITEMS_PER_PAGE) || 1;
    const paginatedHistory = historyItems.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pl-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/70">Historial (Enviados)</h3>
                    <div className="flex bg-app-card border border-app-border rounded-xl p-1 shadow-inner scale-75 origin-left">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><List size={14} /></button>
                    </div>
                </div>
                <button onClick={async () => { if(confirm('¿Limpiar historial?')) { await fetch('/api/reminders/bulk?type=sent', { method: 'DELETE' }); window.location.reload(); } }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-[10px] font-black text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest">
                    <Trash2 size={12} /> Limpiar Historial
                </button>
            </div>
            {viewMode === 'grid' ? (
                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: {
                            opacity: 1,
                            transition: { staggerChildren: 0.05 }
                        }
                    }}
                >
                    <AnimatePresence mode="popLayout">
                    {paginatedHistory.map((r) => (
                        <motion.div 
                            key={r.id} 
                            variants={{
                                hidden: { opacity: 0, scale: 0.95, y: 10 },
                                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                            }}
                            layout
                            className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl p-6 shadow-lg overflow-hidden group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-emerald-500/20 text-[10px] font-black text-emerald-400 rounded-lg uppercase tracking-wider">Entregado</span>
                                    {r.mediaPath && <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded-lg border border-purple-500/20"><Paperclip size={10} /> MEDIA</span>}
                                </div>
                                <span className="text-[10px] font-bold tabular-nums text-app-text-muted">{r.time}</span>
                            </div>
                            <p className="text-sm text-app-text-muted/80 line-clamp-3 mb-4 leading-relaxed line-through decoration-slate-400/30">{r.text}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-app-border">
                                <span className="text-[10px] text-app-text-muted font-bold truncate max-w-[140px]">A: {r.chatId}</span>
                                <button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/60 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="bg-app-card border border-app-border rounded-3xl overflow-hidden shadow-xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-app-bg/50 border-b border-app-border">
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Fecha / Hora</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Destinatario</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Contenido</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <motion.tbody 
                            className="divide-y divide-app-border"
                            initial="hidden"
                            animate="show"
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.05 }
                                }
                            }}
                        >
                            <AnimatePresence mode="popLayout">
                            {paginatedHistory.map((r) => {
                                const date = new Date(r.time);
                                return (
                                    <motion.tr 
                                        key={r.id} 
                                        variants={{
                                            hidden: { opacity: 0, x: -10 },
                                            show: { opacity: 1, x: 0 }
                                        }}
                                        layout
                                        className="hover:bg-app-bg/30 transition-colors"
                                    >
                                        <td className="px-6 py-4"><p className="text-xs font-black tabular-nums text-app-text-muted">{date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p><p className="text-[10px] text-app-text-muted font-bold">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p></td>
                                        <td className="px-6 py-4"><p className="text-xs font-bold text-app-text-muted truncate max-w-[120px]">{r.chatId}</p></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2">{r.mediaPath && <Paperclip size={10} className="text-purple-400/50 shrink-0" />}<p className="text-[11px] text-app-text-muted/80 truncate max-w-[200px] line-through decoration-slate-400/30">{r.text}</p></div></td>
                                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/70 rounded-lg transition-all"><Trash2 size={14} /></button></div></td>
                                    </motion.tr>
                                );
                            })}
                            </AnimatePresence>
                        </motion.tbody>
                    </table>
                </div>
            )}
            
            {totalHistoryPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button onClick={() => setHistoryPage((p: number) => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-3 py-1.5 bg-app-card border border-app-border rounded-lg text-[10px] font-black uppercase text-app-text-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Anterior</button>
                    <span className="text-[10px] font-black text-app-text-muted bg-app-card px-3 py-1.5 rounded-lg border border-app-border">{historyPage} / {totalHistoryPages}</span>
                    <button onClick={() => setHistoryPage((p: number) => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="px-3 py-1.5 bg-app-card border border-app-border rounded-lg text-[10px] font-black uppercase text-app-text-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Siguiente</button>
                </div>
            )}
        </div>
    );
}
