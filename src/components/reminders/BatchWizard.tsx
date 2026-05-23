import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';

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
    onScanFolder?: () => void;
    batchProgress: { current: number; total: number; filename: string } | null;
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
    onUpload,
    onScanFolder,
    batchProgress
}: BatchWizardProps) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg"
            >
                {/* Glow behind modal */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2.5rem] blur-xl opacity-20 dark:opacity-30"></div>
                
                <div className="relative bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 w-full rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/30">
                            <Zap size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Asistente Inteligente</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Configura los datos y luego sube tus archivos.</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Destinatario Global</label>
                                <button onClick={onOpenGroupModal} className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 uppercase transition-colors">Buscar Grupos</button>
                            </div>
                            <input
                                type="text"
                                value={batchChatId}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchChatId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-slate-800 dark:text-white shadow-inner"
                                placeholder="Número o ID de grupo..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 mb-2 block tracking-widest">Hora de Envío</label>
                                <input
                                    type="time"
                                    value={batchTime}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchTime(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl p-4 flex flex-col justify-center shadow-sm">
                                <p className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Detección Automática</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">Usa <b className="text-purple-600 dark:text-purple-400">DD-MM</b> o <b className="text-purple-600 dark:text-purple-400">DD-MM-YYYY</b>. El sistema <b>forzará el año actual</b> para agendarlos.</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 mb-2 block tracking-widest">Mensaje Global</label>
                            <textarea
                                value={batchText}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBatchText(e.target.value)}
                                className="w-full h-28 bg-slate-50 dark:bg-[#131B2C] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none resize-none transition-all text-slate-800 dark:text-white shadow-inner custom-scrollbar"
                                placeholder="Usa {ARCHIVO} para poner el nombre del archivo..."
                            />
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-2 italic">* Usa {"{ARCHIVO}"} para insertar el nombre real del archivo.</p>
                        </div>

                        <div className="pt-4 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-[#1A2235] text-slate-600 dark:text-slate-300 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <label className="flex-[2] flex items-center justify-center cursor-pointer py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-purple-500/25 hover:scale-[1.02] active:scale-95 transition-all">
                                    Subir Archivos y Programar
                                    <input type="file" className="hidden" multiple onChange={onUpload} />
                                </label>
                            </div>
                            
                            {onScanFolder && (
                                <button
                                    onClick={onScanFolder}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Escanear Carpeta Física (data/uploads)
                                </button>
                            )}
                        </div>
                    </div>

                    {batchProgress && (
                        <div className="absolute inset-0 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8 rounded-[2.5rem] animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-purple-500/40 mb-6 animate-bounce">
                            <Zap size={36} className="animate-pulse" />
                        </div>
                        
                        <h3 className="text-2xl font-black text-app-text mb-2 tracking-tight">Procesando Lista de Espera...</h3>
                        <p className="text-sm text-app-text-muted font-medium mb-8 text-center">
                            Programando envíos uno por uno para asegurar su correcta entrega.
                        </p>

                        <div className="w-full max-w-md bg-slate-100 dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner relative overflow-hidden">
                            <div className="flex justify-between items-end mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">Archivo Actual</p>
                                    </div>
                                    <p className="text-xs font-mono font-bold text-app-text truncate max-w-[200px] animate-pulse">
                                        {batchProgress.filename}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-app-text-muted mb-1 uppercase tracking-widest opacity-60">Progreso</p>
                                    <p className="text-base font-black text-app-text flex items-center justify-end gap-1.5">
                                        <span className="text-purple-500 tabular-nums">{batchProgress.current}</span>
                                        <span className="text-app-text-muted/30 text-xs">de</span>
                                        <span className="tabular-nums">{batchProgress.total}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800/50 rounded-2xl overflow-hidden p-1">
                                <div 
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl transition-all duration-300 ease-out relative"
                                    style={{ width: `${Math.max((batchProgress.current / batchProgress.total) * 100, 5)}%` }}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite] w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </motion.div>
        </motion.div>
    );
}
