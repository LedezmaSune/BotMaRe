'use client';

import { useState } from 'react';
import { Megaphone, Upload, Wand2, Loader2, Send } from 'lucide-react';
import { VariableTextarea } from './VariableTextarea';
import { Template } from '../types';

interface MassMessagingProps {
    onSend: (contacts: string, message: string, media: File | null) => Promise<void>;
    onReview: (text: string) => Promise<string | null>;
    templates: Template[];
    groups: any[];
}

export function MassMessaging({ onSend, onReview, templates, groups }: MassMessagingProps) {
    const [contacts, setContacts] = useState('');
    const [message, setMessage] = useState('');
    const [media, setMedia] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [reviewing, setReviewing] = useState(false);

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

    const contactCount = contacts.split(/[\n,]+/).filter(c => c.trim()).length;

    return (
        <section className="glass-effect border border-app-border rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-6xl mx-auto shadow-[0_32px_64px_rgba(0,0,0,0.2)] relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
            
            <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-12 relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-white shadow-[0_15px_30px_rgba(6,182,212,0.3)] transform -rotate-2 hover:rotate-0 transition-all duration-500">
                    <Megaphone className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2} />
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
                                    className="bg-slate-200 dark:bg-slate-800/80 border-none rounded-md text-[9px] font-bold py-1 px-2 outline-none cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 text-app-text"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setContacts(prev => prev + (prev ? '\n' : '') + e.target.value);
                                            e.target.value = "";
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
                                    onChange={(e) => {
                                        const t = templates.find(temp => temp.id === Number(e.target.value));
                                        if (t) setMessage(t.content);
                                        e.target.value = "";
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

                    <div className="bg-slate-100 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                        <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest flex items-center gap-2 mb-2">Adjunto de Seguridad</label>
                        <input 
                            type="file" 
                            onChange={(e) => setMedia(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-app-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-300 dark:hover:file:bg-slate-700 transition-all cursor-pointer"
                        />
                    </div>

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
