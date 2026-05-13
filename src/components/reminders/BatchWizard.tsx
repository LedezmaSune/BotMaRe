import React from 'react';
import { Zap } from 'lucide-react';

interface BatchWizardProps {
    batchChatId: string;
    setBatchChatId: (val: string) => void;
    batchTime: string;
    setBatchTime: (val: string) => void;
    batchText: string;
    setBatchText: (val: string) => void;
    onOpenGroupModal: () => void;
    onClose: () => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BatchWizard({
    batchChatId,
    setBatchChatId,
    batchTime,
    setBatchTime,
    batchText,
    setBatchText,
    onOpenGroupModal,
    onClose,
    onUpload
}: BatchWizardProps) {
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
            <div className="bg-app-card border border-app-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                        <Zap size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-app-text tracking-tight">Asistente Inteligente</h2>
                        <p className="text-app-text-muted text-xs font-medium">Configura los datos y luego sube tus archivos.</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] uppercase font-black text-app-text-muted tracking-widest">Destinatario Global</label>
                            <button onClick={onOpenGroupModal} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">Buscar Grupos</button>
                        </div>
                        <input
                            type="text"
                            value={batchChatId}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchChatId(e.target.value)}
                            className="w-full bg-app-bg dark:bg-background border border-app-border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-app-text shadow-inner"
                            placeholder="Número o ID de grupo..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-black text-app-text-muted mb-2 block tracking-widest">Hora de Envío</label>
                            <input
                                type="time"
                                value={batchTime}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchTime(e.target.value)}
                                className="w-full bg-app-bg dark:bg-background border border-app-border rounded-2xl px-5 py-4 text-sm text-app-text outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                        <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 flex flex-col justify-center">
                            <p className="text-[9px] font-bold text-purple-400 uppercase mb-1">Detección Automática</p>
                            <p className="text-[10px] text-app-text-muted leading-tight">Usa <b className="text-purple-400">DD-MM</b> o <b className="text-purple-400">DD-MM-YYYY</b>. El sistema <b>siempre forzará el año actual</b> para agendarlos correctamente en tu calendario vigente.</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-black text-app-text-muted mb-2 block tracking-widest">Mensaje Global</label>
                        <textarea
                            value={batchText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBatchText(e.target.value)}
                            className="w-full h-28 bg-app-bg dark:bg-background border border-app-border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none resize-none transition-all text-app-text shadow-inner custom-scrollbar"
                            placeholder="Usa {ARCHIVO} para poner el nombre del archivo..."
                        />
                        <p className="text-[9px] text-app-text-muted mt-2 italic">* Usa {"{ARCHIVO}"} para insertar el nombre real del archivo.</p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-app-text-muted rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancelar
                        </button>
                        <label className="flex-[2] flex items-center justify-center cursor-pointer py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                            Subir Archivos y Programar
                            <input type="file" className="hidden" multiple onChange={onUpload} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
