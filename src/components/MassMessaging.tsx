'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Megaphone, Upload, Wand2, Loader2, Send, File, X, Tags, Briefcase } from 'lucide-react';
import { VariableTextarea } from './VariableTextarea';
import { Template } from '../types';

interface MassMessagingProps {
    onSend: (contacts: string, message: string, media: File[], channel: string) => Promise<void>;
    onCancel: () => Promise<void>;
    onReview: (text: string, mode?: 'standard' | 'spintax') => Promise<string | null>;
    templates: Template[];
    groups: any[];
    uploadProgress?: number | null;
    progress?: { current: number, total: number, percentage: number, isWaiting?: boolean, waitMs?: number } | null;
    logs?: any[];
}

export function MassMessaging({ onSend, onCancel, onReview, templates, groups, uploadProgress, progress, logs = [] }: MassMessagingProps) {
    const [contacts, setContacts] = useState('');
    const [message, setMessage] = useState('');
    const [media, setMedia] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [reviewingMode, setReviewingMode] = useState<'standard' | 'spintax' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
    const [crmTags, setCrmTags] = useState<any[]>([]);
    const [remainingWait, setRemainingWait] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar etiquetas CRM al iniciar
    useEffect(() => {
        axios.get('/api/crm/tags')
            .then(res => {
                if (res.data?.success && Array.isArray(res.data.tags)) {
                    setCrmTags(res.data.tags);
                }
            })
            .catch(() => {});
    }, []);

    // Timer para el Anti-ban
    useEffect(() => {
        if (progress?.isWaiting && progress.waitMs) {
            setRemainingWait(Math.ceil(progress.waitMs / 1000));
            const interval = setInterval(() => {
                setRemainingWait(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setRemainingWait(0);
        }
    }, [progress?.isWaiting, progress?.waitMs]);

    // Soporte para pegar archivos desde el portapapeles (Ctrl+V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                const pastedFiles = Array.from(e.clipboardData.files);
                setMedia(prev => [...prev, ...pastedFiles]);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // Cargar contactos de una etiqueta CRM
    const handleLoadCRMTag = async (tagId: string) => {
        if (!tagId) return;
        try {
            const res = await axios.get('/api/crm');
            if (res.data?.success && Array.isArray(res.data.contacts)) {
                const taggedContacts = res.data.contacts.filter((c: any) => c.tags && c.tags.includes(tagId));
                if (taggedContacts.length === 0) {
                    alert(`No hay contactos con la etiqueta "${tagId}" en el CRM.`);
                    return;
                }
                const formatted = taggedContacts.map((c: any) => `${c.phone || c.id}, ${c.name || ''}`).join('\n');
                setContacts(prev => {
                    const trimmed = prev.trim();
                    return trimmed ? `${trimmed}\n${formatted}` : formatted;
                });
            }
        } catch (e) {
            alert('Error al cargar contactos del CRM');
        }
    };

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

    const handleReview = async (mode: 'standard' | 'spintax' = 'standard') => {
        if (!message) return;
        setReviewingMode(mode);
        const corrected = await onReview(message, mode);
        if (corrected) setMessage(corrected);
        setReviewingMode(null);
    };

    const handleSubmit = async () => {
        setLoading(true);
        await onSend(contacts, message, media, channel);
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

                {/* Channel Selector */}
                <div className="ml-auto flex items-center bg-slate-200 dark:bg-slate-900 rounded-xl p-1 shadow-inner border border-slate-300 dark:border-white/5 relative z-10 self-start">
                    <button
                        onClick={() => setChannel('whatsapp')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            channel === 'whatsapp'
                                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : 'text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        WhatsApp
                    </button>
                    <button
                        onClick={() => setChannel('sms')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            channel === 'sms'
                                ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                                : 'text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        SMS Masivo
                    </button>
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
                                            setContacts(prev => {
                                                const trimmed = prev.trim();
                                                return trimmed ? `${trimmed}\n${e.target.value}` : e.target.value;
                                            });
                                        }
                                    }}
                                >
                                    <option value="">+ Añadir Grupo</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.subject}</option>
                                    ))}
                                </select>
                            )}

                            {crmTags.length > 0 && (
                                <select 
                                    value=""
                                    className="bg-purple-500/10 border border-purple-500/30 rounded-md text-[9px] font-bold py-1 px-2 outline-none cursor-pointer hover:bg-purple-500/20 text-purple-300"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleLoadCRMTag(e.target.value);
                                        }
                                    }}
                                >
                                    <option value="" className="bg-[#111827] text-slate-300">🏷️ Cargar Tag CRM</option>
                                    {crmTags.map(t => (
                                        <option key={t.id} value={t.id} className="bg-[#111827] text-white">{t.name}</option>
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
                        placeholder="+528181234567, Nombre&#10;+14155552671, Cliente USA&#10;+34612345678, Cliente España&#10;5512345678, Cliente Local"
                        className="w-full h-80 bg-app-bg dark:bg-background border border-app-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500/30 outline-none transition-all resize-none font-mono text-app-text placeholder:text-app-text-muted/50 shadow-inner"
                    />
                </div>

                {/* Message */}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Cuerpo del Mensaje</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleReview('standard')}
                                    disabled={!!reviewingMode || !message}
                                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 px-3.5 py-1.5 rounded-lg border border-cyan-500/20 transition-all hover:bg-cyan-500/20 disabled:opacity-30 active:scale-95"
                                >
                                    {reviewingMode === 'standard' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                                    {reviewingMode === 'standard' ? 'Revisando...' : 'Perfeccionar con IA'}
                                </button>
                                <button 
                                    onClick={() => handleReview('spintax')}
                                    disabled={!!reviewingMode || !message}
                                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-[10px] font-bold uppercase tracking-widest bg-purple-500/10 px-3.5 py-1.5 rounded-lg border border-purple-500/20 transition-all hover:bg-purple-500/20 disabled:opacity-30 active:scale-95"
                                >
                                    {reviewingMode === 'spintax' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                                    {reviewingMode === 'spintax' ? 'Generando...' : 'Generar Spintax'}
                                </button>
                            </div>
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
                        <div className="text-[10px] text-app-text-muted mt-2 space-y-1">
                            <div>Variables: <code className="text-cyan-400">{' {NOMBRE}'}</code>, <code className="text-cyan-400">{' {FECHA}'}</code>, <code className="text-cyan-400">{' {HORA_12}'}</code> (Escribe <b>{'{'}</b> para sugerencias)</div>
                            <div>Archivos/Medios: <code className="text-cyan-400">[IMG: url]</code>, <code className="text-cyan-400">[DOC: url]</code>, <code className="text-cyan-400">[VIDEO: url]</code>, <code className="text-cyan-400">[AUDIO: url]</code> (Escribe <b>[</b> para sugerencias)</div>
                        </div>
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

                    {/* Barra de Progreso de Subida de Archivos */}
                    {typeof uploadProgress === 'number' && (
                        <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                    <span className="text-xs font-bold text-indigo-200">
                                        {uploadProgress < 100 ? 'Subiendo archivos multimedia al servidor...' : '¡Archivos cargados! Iniciando cola...'}
                                    </span>
                                </div>
                                <span className="text-xs font-black text-indigo-400 tabular-nums">{uploadProgress}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Barra de Progreso Animada y Premium de Difusión */}
                    {progress && (
                        <div className="bg-slate-100 dark:bg-slate-900/80 p-6 rounded-3xl border border-cyan-500/30 dark:border-cyan-500/20 animate-in fade-in zoom-in duration-500 shadow-[0_20px_50px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                            {/* Glow effect background */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-pulse"></div>
                            
                            <div className="flex justify-between items-end mb-4 relative z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Cola Activa en Tiempo Real</p>
                                    </div>
                                    <h3 className="text-3xl font-black text-app-text tabular-nums flex items-baseline gap-1">
                                        {progress.percentage}
                                        <span className="text-sm text-cyan-400 font-bold">%</span>
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-app-text-muted mb-1 uppercase tracking-widest opacity-60">Avance de Campaña</p>
                                    <p className="text-base font-black text-app-text flex items-center justify-end gap-1.5">
                                        <span className="text-cyan-400 tabular-nums">{progress.current}</span>
                                        <span className="text-app-text-muted/40 text-xs">/</span>
                                        <span className="tabular-nums">{progress.total}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800/80 rounded-2xl overflow-hidden p-0.5 shadow-inner relative">
                                <div 
                                    className={`h-full rounded-xl transition-all duration-700 ease-out relative ${progress.isWaiting ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]'}`}
                                    style={{ width: `${Math.max(progress.percentage, 3)}%` }}
                                >
                                    {/* Animated Shimmer Over Progress */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.5)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite] w-full"></div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-[10px] font-bold uppercase tracking-wider">
                                    {progress.percentage === 100 ? (
                                        <span className="text-emerald-400 flex items-center gap-1.5 font-black">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                            ¡DIFUSIÓN COMPLETADA CON ÉXITO!
                                        </span>
                                    ) : progress.isWaiting ? (
                                        <span className="text-amber-400 flex items-center gap-1.5 font-bold animate-pulse">
                                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                                            PAUSA ANTI-BAN: {remainingWait}S RESTANTES...
                                        </span>
                                    ) : (
                                        <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
                                            <Loader2 className="animate-spin" size={12} />
                                            ENVIANDO MENSAJE...
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] font-mono font-bold text-slate-400">
                                    {Math.round(progress.current)} de {progress.total}
                                </div>
                            </div>

                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if(confirm('¿Seguro que quieres detener y cancelar la difusión actual?')) onCancel();
                                }}
                                className="w-full mt-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-red-500/10"
                            >
                                <div className="w-2 h-2 bg-red-400 rounded-sm animate-pulse"></div>
                                Cancelar y Detener Difusión
                            </button>

                            {/* Logs en tiempo real */}
                            {logs.length > 0 && (
                                <div className="mt-5 space-y-2 pt-4 border-t border-slate-200 dark:border-white/10 animate-in slide-in-from-top-2 duration-500">
                                    <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                                        Historial de Envíos en Vivo (Últimos {logs.length})
                                    </p>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {logs.map((log, i) => (
                                            <div key={`${log.number}-${i}`} className="flex items-center justify-between bg-white/40 dark:bg-black/30 px-3 py-2 rounded-xl border border-white/50 dark:border-white/5 animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : (log.status === 'skipped' ? 'bg-amber-400' : 'bg-rose-400')}`}></div>
                                                    <span className="text-[11px] font-bold text-app-text truncate max-w-[140px]">{log.name || log.number}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] font-mono text-app-text-muted/70 tabular-nums">{log.number}</span>
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                        log.status === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : (log.status === 'skipped' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20')
                                                    }`}>
                                                        {log.status === 'success' ? 'Enviado' : (log.status === 'skipped' ? 'Omitido' : 'Fallo')}
                                                    </span>
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
