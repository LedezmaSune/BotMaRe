import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Trash2, Zap, Edit3, Paperclip } from 'lucide-react';
import { Reminder } from '../../types';

interface PendingListProps {
    reminders: Reminder[];
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    pendingPage: number;
    setPendingPage: (page: number | ((p: number) => number)) => void;
    onEdit: (r: Reminder) => void;
    onSendNow: (id: number) => void;
    onDelete: (id: number) => void;
    onRefresh?: () => void;
}

export function PendingList({
    reminders,
    viewMode,
    setViewMode,
    pendingPage,
    setPendingPage,
    onEdit,
    onSendNow,
    onDelete,
    onRefresh
}: PendingListProps) {
    const ITEMS_PER_PAGE = 8;
    const pendingItems = reminders.filter(r => r.status === 'pending' || r.status === 'failed');
    const totalPendingPages = Math.ceil(pendingItems.length / ITEMS_PER_PAGE) || 1;
    const paginatedPending = pendingItems.slice((pendingPage - 1) * ITEMS_PER_PAGE, pendingPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pl-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-app-text-muted">Pendientes</h3>
                    <div className="flex bg-app-card border border-app-border rounded-xl p-1 shadow-inner scale-75 origin-left">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><List size={14} /></button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={async () => { 
                        if(confirm('¿Reparar fechas viejas al año actual? Los eventos que ya pasaron en este año serán eliminados automáticamente.')) { 
                            try {
                                const res = await fetch('/api/reminders/bulk/fix-dates', { method: 'POST' });
                                const data = await res.json();
                                alert(`✅ Proceso finalizado:\n- ${data.fixed} eventos actualizados al año actual.\n- ${data.deleted} eventos eliminados (ya pasaron este año).`);
                                onRefresh?.();
                            } catch(e) {
                                alert('Error al reparar.');
                            }
                        } 
                    }} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-[10px] font-black text-amber-500 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all uppercase tracking-widest">
                        <Zap size={12} /> Auto-Año
                    </button>

                    <button onClick={async () => { if(confirm('¿Borrar TODOS los pendientes y fallidos?')) { await fetch('/api/reminders/bulk?type=pending', { method: 'DELETE' }); await fetch('/api/reminders/bulk?type=failed', { method: 'DELETE' }); onRefresh?.(); } }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-[10px] font-black text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest">
                        <Trash2 size={12} /> Limpiar Todo
                    </button>
                </div>
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
                    {paginatedPending.map((r) => (
                        <motion.div 
                            key={r.id} 
                            variants={{
                                hidden: { opacity: 0, scale: 0.95, y: 10 },
                                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                            }}
                            layout
                            className="bg-app-card border border-app-border rounded-3xl p-6 shadow-xl relative overflow-hidden group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${r.status === 'failed' || new Date(r.time) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-background/80 text-app-text-muted'}`}>{r.status === 'failed' ? 'Fallido' : (new Date(r.time) < new Date() ? 'Expirado' : r.status)}</span>
                                    {r.mediaPath && <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded-lg border border-purple-500/20"><Paperclip size={10} /> MEDIA</span>}
                                </div>
                                <span className="text-[10px] font-bold tabular-nums text-app-text-muted">{r.time}</span>
                            </div>
                            <p className="text-sm text-app-text/80 line-clamp-2 mb-4 leading-relaxed">{r.text}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-app-border">
                                <div className="flex gap-1">
                                    <button onClick={() => onEdit(r)} className="p-2 hover:bg-cyan-500/10 text-app-text-muted hover:text-cyan-500 rounded-lg transition-all"><Edit3 size={16} /></button>
                                    <button onClick={() => onSendNow(r.id)} className="p-2 hover:bg-amber-500/10 text-app-text-muted hover:text-amber-500 rounded-lg transition-all"><Zap size={16} /></button>
                                </div>
                                <button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/70 rounded-lg transition-all"><Trash2 size={16} /></button>
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
                            {paginatedPending.map((r) => {
                                const date = new Date(r.time);
                                const isPastOrFailed = r.status === 'failed' || date < new Date();
                                return (
                                    <motion.tr 
                                        key={r.id} 
                                        variants={{
                                            hidden: { opacity: 0, x: -10 },
                                            show: { opacity: 1, x: 0 }
                                        }}
                                        layout
                                        className={`hover:bg-app-bg/30 transition-colors ${isPastOrFailed ? 'bg-red-500/5' : ''}`}
                                    >
                                        <td className="px-6 py-4"><p className={`text-xs font-black tabular-nums ${isPastOrFailed ? 'text-red-400' : 'text-app-text'}`}>{date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p><p className="text-[10px] text-app-text-muted font-bold">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p></td>
                                        <td className="px-6 py-4"><p className="text-xs font-bold text-app-text truncate max-w-[120px]">{r.chatId}</p></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2">{r.mediaPath && <Paperclip size={10} className="text-purple-400 shrink-0" />}<p className="text-[11px] text-app-text-muted truncate max-w-[200px]">{r.text}</p></div></td>
                                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => onEdit(r)} className="p-2 hover:bg-cyan-500/10 text-app-text-muted hover:text-cyan-500 rounded-lg transition-all"><Edit3 size={14} /></button><button onClick={() => onSendNow(r.id)} className="p-2 hover:bg-amber-500/10 text-app-text-muted hover:text-amber-500 rounded-lg transition-all"><Zap size={14} /></button><button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/70 rounded-lg transition-all"><Trash2 size={14} /></button></div></td>
                                    </motion.tr>
                                );
                            })}
                            </AnimatePresence>
                        </motion.tbody>
                    </table>
                </div>
            )}
            
            {totalPendingPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button onClick={() => setPendingPage((p: number) => Math.max(1, p - 1))} disabled={pendingPage === 1} className="px-3 py-1.5 bg-app-card border border-app-border rounded-lg text-[10px] font-black uppercase text-app-text-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Anterior</button>
                    <span className="text-[10px] font-black text-app-text-muted bg-app-card px-3 py-1.5 rounded-lg border border-app-border">{pendingPage} / {totalPendingPages}</span>
                    <button onClick={() => setPendingPage((p: number) => Math.min(totalPendingPages, p + 1))} disabled={pendingPage === totalPendingPages} className="px-3 py-1.5 bg-app-card border border-app-border rounded-lg text-[10px] font-black uppercase text-app-text-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Siguiente</button>
                </div>
            )}
        </div>
    );
}
