import React from 'react';
import { Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface GroupModalProps {
    groups: any[];
    groupLoading: boolean;
    onClose: () => void;
    onSelectGroup: (group: any) => void;
}

export function GroupModal({ groups, groupLoading, onClose, onSelectGroup }: GroupModalProps) {
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-app-bg dark:bg-slate-900 border border-app-border w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh] relative overflow-hidden"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-app-text font-black text-xl tracking-tight">Seleccionar Grupo</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-app-text-muted" />
                    </button>
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar">
                    {groupLoading ? <p className="text-center py-10 text-app-text-muted">Cargando...</p> : 
                        groups.map(g => (
                            <button key={g.id} onClick={() => onSelectGroup(g)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-app-card hover:bg-cyan-500/10 hover:border-cyan-500/30 text-left transition-all border border-app-border/50 shadow-sm active:scale-[0.98]">
                                <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md shadow-cyan-500/20">{g.subject?.charAt(0) || 'G'}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-app-text truncate">{g.subject || 'Sin nombre'}</p>
                                    <p className="text-[10px] text-app-text-muted font-mono truncate">{g.id}</p>
                                </div>
                            </button>
                        ))}
                </div>
            </motion.div>
        </div>
    );
}
