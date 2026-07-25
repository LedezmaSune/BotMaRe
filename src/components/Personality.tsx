'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Loader2, Globe, FileText, ChevronDown, CheckCircle2, XCircle, User, BookOpen, Upload } from 'lucide-react';
import { Settings as UserSettings } from '../types';
import { siteConfig } from '../config';
import { VariableTextarea } from './VariableTextarea';

interface PersonalityProps {
    initialSettings: UserSettings;
    onUpdate: (settings: UserSettings) => Promise<void>;
}

export function Personality({ initialSettings, onUpdate }: PersonalityProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [loading, setLoading] = useState(false);
    const [learningStatus, setLearningStatus] = useState<'idle' | 'loading'>('idle');
    const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
    const [showManual, setShowManual] = useState(false);

    const showFeedback = (message: string, type: 'success' | 'error' | 'info') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(settings);
            showFeedback('Personalidad actualizada correctamente', 'success');
        } catch (error) {
            showFeedback('Error al actualizar la configuración', 'error');
        }
        setLoading(false);
    };

    const handleLearnUrl = async () => {
        const input = document.getElementById('learn-url-input') as HTMLInputElement;
        const url = input?.value;
        if (!url) {
            showFeedback('Por favor ingresa una URL válida', 'error');
            return;
        }
        
        setLearningStatus('loading');
        try {
            const res = await fetch('/api/settings/learn-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.success) {
                showFeedback(`¡URL aprendida! Se añadieron ${data.learnedCount} caracteres a la base de conocimiento.`, 'success');
                const sRes = await fetch('/api/settings');
                if (sRes.ok) setSettings(await sRes.json());
                input.value = '';
            } else {
                showFeedback('Error al aprender de la URL: ' + data.error, 'error');
            }
        } catch (e) {
            showFeedback('Error de conexión al procesar la URL', 'error');
        } finally {
            setLearningStatus('idle');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setLearningStatus('loading');
        showFeedback(`Procesando documento: ${file.name}...`, 'info');
        try {
            let text = "";
            if (file.name.toLowerCase().endsWith('.pdf')) {
                if (!(window as any).pdfjsLib) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                        script.onload = () => {
                            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                            resolve(true);
                        };
                        document.head.appendChild(script);
                    });
                }
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await (window as any).pdfjsLib.getDocument({data: arrayBuffer}).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(" ") + " \n";
                }
            } else {
                text = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target?.result as string);
                    reader.readAsText(file);
                });
            }
            
            const currentKnowledge = settings.possible_responses || "";
            const newKnowledge = `${currentKnowledge}\n\n[DOC: ${file.name}]:\n${text}`.trim();
            
            setSettings({...settings, possible_responses: newKnowledge});
            showFeedback(`¡Documento "${file.name}" leído e integrado al cerebro! Asegúrate de guardar los cambios.`, 'success');
        } catch (err) {
            showFeedback('Error al leer o procesar el archivo.', 'error');
        } finally {
            setLearningStatus('idle');
            e.target.value = '';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-app-card border border-app-border rounded-3xl p-8 backdrop-blur-xl shadow-xl shadow-purple-500/5 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                        <Brain size={36} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Personalidad del Bot</h2>
                        <p className="text-app-text-muted mt-1 text-sm max-w-xl">
                            Configura la identidad, el tono de voz y dota a tu inteligencia artificial de todo el conocimiento necesario para atender como un experto.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Alerta de Feedback Flotante */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
                            feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                            feedback.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        }`}
                    >
                        {feedback.type === 'success' ? <CheckCircle2 size={20} /> : feedback.type === 'error' ? <XCircle size={20} /> : <Loader2 className="animate-spin" size={20} />}
                        <span className="font-bold text-sm">{feedback.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Módulo 1: Identidad Base */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-app-card border border-app-border rounded-3xl p-8 backdrop-blur-xl shadow-lg"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><User size={20} /></div>
                        <h3 className="text-lg font-black text-white tracking-wide">1. Identidad y Comportamiento</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-2">
                            <label className="text-xs uppercase font-black text-purple-400 block tracking-[0.1em]">Nombre del Bot</label>
                            <input
                                type="text"
                                value={settings.bot_name}
                                onChange={(e) => setSettings({...settings, bot_name: e.target.value})}
                                className="w-full bg-black/40 border border-app-border rounded-xl px-5 py-4 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 focus:bg-black/60 outline-none transition-all text-white placeholder:text-white/20"
                                placeholder={siteConfig.aiPlaceholder}
                            />
                            <p className="text-[10px] text-app-text-muted italic pt-1">Este es el nombre con el que la IA se identificará si le preguntan.</p>
                        </div>
                        
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-xs uppercase font-black text-purple-400 block tracking-[0.1em]">System Prompt (Directrices)</label>
                            <VariableTextarea
                                value={settings.system_prompt}
                                onChange={(val) => setSettings({...settings, system_prompt: val})}
                                className="w-full bg-black/40 border border-app-border rounded-xl px-5 py-4 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 focus:bg-black/60 outline-none resize-none transition-all text-white placeholder:text-white/20 leading-relaxed"
                                placeholder="Ej: Eres un experto asesor financiero amable y directo..."
                                rows={5}
                            />
                            <p className="text-[10px] text-app-text-muted italic pt-1">Define la personalidad, tono, qué puede hacer y qué límites tiene tu asistente.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Módulo 2: Cerebro de Datos */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-app-card border border-app-border rounded-3xl p-8 backdrop-blur-xl shadow-lg relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><Brain size={20} /></div>
                            <h3 className="text-lg font-black text-white tracking-wide">2. Base de Conocimiento (El Cerebro)</h3>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setShowManual(!showManual)}
                            className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-4 py-2 rounded-lg transition-colors border border-cyan-500/20"
                        >
                            <BookOpen size={14} />
                            Mini Manual Multimedia
                            <ChevronDown size={14} className={`transition-transform duration-300 ${showManual ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {showManual && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-6"
                            >
                                <div className="p-5 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl">
                                    <h4 className="text-sm font-bold text-cyan-400 mb-2">Enviar Archivos Multimedia y Documentos</h4>
                                    <p className="text-xs text-cyan-100/70 mb-3">
                                        Pega enlaces públicos (Drive, Imgur, etc.) dentro del cerebro usando estas etiquetas. El bot descargará y enviará el archivo real al cliente de forma nativa.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                                        <div className="bg-black/40 p-3 rounded-lg border border-cyan-500/20">
                                            <span className="text-cyan-300 font-bold">[IMG: url]</span> <span className="text-cyan-100/50">- Envía imagen</span>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded-lg border border-cyan-500/20">
                                            <span className="text-cyan-300 font-bold">[DOC: url]</span> <span className="text-cyan-100/50">- Envía PDF/Word</span>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded-lg border border-cyan-500/20">
                                            <span className="text-cyan-300 font-bold">[VIDEO: url]</span> <span className="text-cyan-100/50">- Envía Video</span>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded-lg border border-cyan-500/20">
                                            <span className="text-cyan-300 font-bold">[AUDIO: url]</span> <span className="text-cyan-100/50">- Envía Nota de voz</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-2">
                        <VariableTextarea
                            value={settings.possible_responses}
                            onChange={(val) => setSettings({...settings, possible_responses: val})}
                            className="w-full bg-black/40 border border-app-border rounded-xl px-5 py-5 text-sm focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/30 focus:bg-black/60 outline-none resize-none transition-all font-mono text-cyan-50/90 leading-relaxed custom-scrollbar"
                            placeholder="Escribe o pega aquí toda la información que el bot debe saber: Precios, horarios, catálogos, direcciones, reglas de negocio..."
                            rows={12}
                        />
                        <p className="text-[10px] text-app-text-muted italic pt-1">Este campo acepta texto libre. Toda la información que pongas aquí servirá como contexto base para las respuestas.</p>
                    </div>
                </motion.div>

                {/* Módulo 3: Entrenamiento Externo */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    <div className="bg-gradient-to-br from-app-card to-app-bg border border-app-border hover:border-cyan-500/30 rounded-3xl p-6 transition-all group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Globe size={120} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><Globe size={18} /></div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Aprender desde URL</h4>
                            </div>
                            <p className="text-xs text-app-text-muted leading-relaxed">
                                El bot leerá el texto de cualquier página web pública y lo inyectará automáticamente en su cerebro base.
                            </p>
                            <div className="flex flex-col xl:flex-row gap-2 pt-2">
                                <input
                                    id="learn-url-input"
                                    type="text"
                                    placeholder="https://mi-sitio.com/faq"
                                    className="flex-1 bg-black/40 border border-app-border rounded-xl px-4 py-3 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleLearnUrl}
                                    disabled={learningStatus === 'loading'}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 flex justify-center"
                                >
                                    {learningStatus === 'loading' ? <Loader2 className="animate-spin w-4 h-4" /> : 'Extraer Texto'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-app-card to-app-bg border border-app-border hover:border-emerald-500/30 rounded-3xl p-6 transition-all group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText size={120} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><FileText size={18} /></div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Leer Documento</h4>
                            </div>
                            <p className="text-xs text-app-text-muted leading-relaxed">
                                Sube archivos <span className="font-bold text-white">PDF, TXT o MD</span>. El sistema extraerá el texto y lo anexará al conocimiento de inmediato.
                            </p>
                            <div className="pt-2">
                                <label className="flex items-center justify-center gap-2 w-full bg-black/40 hover:bg-emerald-500/10 border border-dashed border-app-border hover:border-emerald-500/50 text-emerald-500 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98]">
                                    <Upload size={16} />
                                    <span>Seleccionar y Procesar Archivo</span>
                                    <input 
                                        type="file" 
                                        accept=".txt,.csv,.md,.pdf" 
                                        className="hidden" 
                                        onChange={handleFileUpload} 
                                        disabled={learningStatus === 'loading'}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Submit Action */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="pt-6"
                >
                    <button
                        type="submit"
                        disabled={loading || learningStatus === 'loading'}
                        className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-4 active:scale-[0.99] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                        {loading ? 'Sincronizando configuraciones...' : 'Guardar y Sincronizar IA'}
                    </button>
                    <p className="text-center text-xs text-app-text-muted mt-4 opacity-70">
                        Los cambios de personalidad tomarán efecto instantáneamente en los próximos mensajes.
                    </p>
                </motion.div>
                
            </form>
        </div>
    );
}
