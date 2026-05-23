'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Upload, Wand2, Loader2, Send, File, X } from 'lucide-react';
import { VariableTextarea } from './VariableTextarea';
import { Template } from '../types';

interface MassMessagingProps {
    onSend: (contacts: string, message: string, media: File[]) => Promise<void>;
    onCancel: () => Promise<void>;
    onReview: (text: string) => Promise<string | null>;
    templates: Template[];
    groups: any[];
    progress?: { current: number, total: number, percentage: number } | null;
    logs?: any[];
}

export function MassMessaging({ onSend, onCancel, onReview, templates, groups, progress, logs = [] }: MassMessagingProps) {
    const [contacts, setContacts] = useState('');
    const [message, setMessage] = useState('');
    const [media, setMedia] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar borrador al iniciar
    useEffect(() => {
        const savedContacts = localStorage.getItem('botmare_draft_contacts');
        const savedMessage = localStorage.getItem('botmare_draft_message');
        if (savedContacts) setContacts(savedContacts);
        if (savedMessage) setMessage(savedMessage);
    }, []);

    // Guardar borrador al cambiar
    useEffect(() => {
        localStorage.setItem('botmare_draft_contacts', contacts);
        localStorage.setItem('botmare_draft_message', message);
    }, [contacts, message]);

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setContacts(text);
        };
        reader.readAsText(file);
    };

    const handleReview = async () => {
        if (!message) return;
        setReviewing(true);
        const corrected = await onReview(message);
        if (corrected) setMessage(corrected);
        setReviewing(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        await onSend(contacts, message, media);
        setLoading(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setMedia(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
        }
    };

    const contactCount = contacts.split(/[\n,]+/).filter(c => c.trim()).length;

    return (
        <section className="glass-effect border border-app-border rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-6xl mx-auto shadow-[0_32px_64px_rgba(0,0,0,0.2)] relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
            
            <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-12 relative z-10">
                <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-white shadow-[0_15px_30px_rgba(6,182,212,0.3)] transform -rotate-2 hover:rotate-0 transition-all duration-500 relative ${progress ? 'animate-pulse' : ''}`}>
                    <Megaphone className={`w-8 h-8 md:w-10 md:h-10 ${progress ? 'animate-bounce' : ''}`} strokeWidth={2} />
                    {progress && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-app-bg animate-ping"></div>
                    )}
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-app-text tracking-tighter leading-tight">Difusión Masiva con IA</h2>
                    <p className="text-app-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mt-1 opacity-70">Campañas enriquecidas y personalización</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                {/* Contacts */}
                <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest flex items-center gap-2">
                                Base de Datos
                                <label className="cursor-pointer bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md text-[9px] transition-colors border border-slate-300 dark:border-slate-700/50 flex items-center gap-1 active:scale-95">
                                    <Upload size={12} /> Subir CSV
                                    <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                                </label>
                            </label>

                            {groups.length > 0 && (
                                <select 
                                    value=""
                                    className="bg-slate-200 dark:bg-slate-800/80 border-none rounded-md text-[9px] font-bold py-1 px-2 outline-none cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 text-app-text"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setContacts(prev => prev + (prev ? '\n' : '') + e.target.value);
                                        }
                                    }}
                                >
                                    <option value="">+ Añadir Grupo</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.subject}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                            {contactCount} contactos
                        </span>
                    <textarea 
                        value={contacts}
                        onChange={(e) => setContacts(e.target.value)}
                        placeholder="8181234567, Nombre&#10;521234567890, Cliente"
                        className="w-full h-80 bg-app-bg dark:bg-background border border-app-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500/30 outline-none transition-all resize-none font-mono text-app-text placeholder:text-app-text-muted/50 shadow-inner"
                    />
                </div>

                {/* Message */}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Cuerpo del Mensaje</label>
                            <button 
                                onClick={handleReview}
                                disabled={reviewing || !message}
                                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 transition-all hover:bg-cyan-500/20 disabled:opacity-30 active:scale-95"
                            >
                                {reviewing ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                                Perfeccionar con IA
                            </button>
                        </div>

                        {templates.length > 0 && (
                            <div className="mb-4">
                                <select
                                    value=""
                                    onChange={(e) => {
                                        const t = templates.find(temp => temp.id === Number(e.target.value));
                                        if (t) setMessage(t.content);
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-app-border rounded-xl px-4 py-2 text-[10px] font-bold text-app-text-muted outline-none transition-all uppercase tracking-widest cursor-pointer hover:border-orange-500/30"
                                >
                                    <option value="">-- Seleccionar Plantilla --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <VariableTextarea 
                            value={message}
                            onChange={(val) => setMessage(val)}
                            placeholder="Hola {NOMBRE}, ¿cómo estás?..."
                            className="w-full h-64 bg-app-bg dark:bg-background border border-app-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500/30 outline-none transition-all resize-none shadow-inner text-app-text placeholder:text-app-text-muted/50"
                        />
                    </div>

                    <motion.div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        animate={{ scale: isDragging ? 1.02 : 1, borderColor: isDragging ? '#06b6d4' : 'rgba(255,255,255,0.05)' }}
                        className={`bg-slate-100 dark:bg-slate-950/40 p-5 rounded-2xl border ${isDragging ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-200 dark:border-white/5'} transition-all flex flex-col items-center justify-center min-h-[120px] cursor-pointer group`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            multiple
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files) {
                                    setMedia(prev => [...prev, ...Array.from(e.target.files!)]);
                                }
                            }}
                            className="hidden"
                        />
                        {media.length > 0 ? (
                            <div className="w-full space-y-2">
                                {media.map((file, i) => (
                                    <div key={i} className="flex items-center gap-4 w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-app-border">
                                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><File size={20} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-app-text truncate">{file.name}</p>
                                            <p className="text-[10px] text-app-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setMedia(prev => prev.filter((_, index) => index !== i)); 
                                            }}
                                            className="p-1.5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="mt-2 flex justify-center">
                                    <p className="text-[10px] text-cyan-500 font-bold hover:underline cursor-pointer">
                                        + Añadir más archivos
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={`p-3 rounded-xl mb-2 transition-colors ${isDragging ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-200 dark:bg-slate-800 text-app-text-muted group-hover:bg-slate-300 dark:group-hover:bg-slate-700'}`}>
                                    <Upload size={24} />
                                </div>
                                <p className="text-xs font-bold text-app-text">Arrastra tu archivo aquí</p>
                                <p className="text-[10px] text-app-text-muted mt-1">o haz clic para explorar</p>
                            </>
                        )}
                    </motion.div>

                    {/* Barra de Progreso Animada y Premium */}
                    {progress && (
                        <div className="bg-slate-100 dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.1)] relative overflow-hidden group">
                            {/* Glow effect background */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30"></div>
                            
                            <div className="flex justify-between items-end mb-4 relative z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Transmisión en Vivo</p>
                                    </div>
                                    <h3 className="text-3xl font-black text-app-text tabular-nums flex items-baseline gap-1">
                                        {progress.percentage}
                                        <span className="text-sm text-app-text-muted font-bold">%</span>
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-app-text-muted mb-1 uppercase tracking-widest opacity-60">Impacto de Campaña</p>
                                    <p className="text-base font-black text-app-text flex items-center justify-end gap-1.5">
                                        <span className="text-cyan-400 tabular-nums">{progress.current}</span>
                                        <span className="text-app-text-muted/30 text-xs">de</span>
                                        <span className="tabular-nums">{progress.total}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="h-5 w-full bg-slate-200 dark:bg-slate-800/50 rounded-2xl overflow-hidden p-1 shadow-inner relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-xl transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                    style={{ width: `${Math.max(progress.percentage, 2)}%` }}
                                >
                                    {/* Animated Shimmer Over Progress */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite] w-full"></div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-[9px] font-bold text-app-text-muted/60 uppercase tracking-[0.15em]">
                                    {progress.percentage === 100 ? (
                                        <span className="text-emerald-500 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                            ¡DIFUSIÓN COMPLETADA CON ÉXITO!
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <Loader2 className="animate-spin" size={10} />
                                            DESPACHANDO COLA EN SEGUNDO PLANO...
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] font-black text-app-text-muted/40 uppercase">
                                    {Math.round(progress.current)} / {progress.total}
                                </div>
                            </div>

                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(confirm('¿Seguro que quieres detener la difusión?')) onCancel();
                                }}
                                className="w-full mt-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <div className="w-2 h-2 bg-red-500 rounded-sm animate-pulse"></div>
                                Cancelar Difusión
                            </button>

                            {/* Logs en tiempo real */}
                            {logs.length > 0 && (
                                <div className="mt-6 space-y-2 pt-4 border-t border-slate-200 dark:border-white/5 animate-in slide-in-from-top-2 duration-500">
                                    <p className="text-[8px] font-black text-app-text-muted/40 uppercase tracking-[0.2em] mb-3">Actividad Reciente</p>
                                    <div className="space-y-1.5">
                                        {logs.map((log, i) => (
                                            <div key={`${log.number}-${i}`} className="flex items-center justify-between bg-white/40 dark:bg-black/20 px-3 py-2 rounded-xl border border-white/50 dark:border-white/5 animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-[10px] font-bold text-app-text truncate max-w-[120px]">{log.name || log.number}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-medium text-app-text-muted/60 tabular-nums">{log.number}</span>
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md uppercase tracking-tighter">Enviado</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit}
                        disabled={loading || !contacts || !message}
                        className="w-full py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(79,70,229,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        {loading ? 'Lanzando...' : 'Iniciar Difusión'}
                    </button>
                </div>
            </div>
        </section>
    );
}
