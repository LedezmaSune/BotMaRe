import React from 'react';
import { Trash2 } from 'lucide-react';

interface GroupModalProps {
    groups: any[];
    groupLoading: boolean;
    onClose: () => void;
    onSelectGroup: (group: any) => void;
}

export function GroupModal({ groups, groupLoading, onClose, onSelectGroup }: GroupModalProps) {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-app-card border border-app-border w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-app-text font-bold text-lg">Grupos</h3>
                    <button onClick={onClose}><Trash2 size={20} className="rotate-45 text-app-text-muted" /></button>
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar">
                    {groupLoading ? <p className="text-center py-10 text-app-text-muted">Cargando...</p> : 
                        groups.map(g => (
                            <button key={g.id} onClick={() => onSelectGroup(g)} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-cyan-500/10 text-left transition-all border border-transparent hover:border-cyan-500/20">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-black">{g.subject?.charAt(0)}</div>
                                <div className="min-w-0"><p className="text-sm font-bold truncate">{g.subject}</p><p className="text-[10px] text-app-text-muted">{g.id}</p></div>
                            </button>
                        ))}
                </div>
            </div>
        </div>
    );
}
