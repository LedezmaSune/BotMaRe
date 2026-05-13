'use client';
import React from 'react';

import { useState } from 'react';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { Settings as UserSettings } from '../types';
import { siteConfig } from '../config';

interface PersonalityProps {
    initialSettings: UserSettings;
    onUpdate: (settings: UserSettings) => Promise<void>;
}

export function Personality({ initialSettings, onUpdate }: PersonalityProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onUpdate(settings);
        setLoading(false);
    };

    return (
        <section className="bg-app-card border border-app-border rounded-3xl p-6 lg:p-10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto shadow-2xl transition-all">
            <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                    <Brain size={36} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Personalidad del Bot</h2>
                    <p className="text-app-text-muted text-base">Define la identidad, el tono y el conocimiento experto de tu IA.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Columna Izquierda: Identidad y Prompt */}
                    <div className="space-y-6">
                        <div className="bg-black/20 p-6 rounded-3xl border border-app-border space-y-6 h-full">
                            <div>
                                <label className="text-xs uppercase font-black text-purple-400 mb-3 block tracking-[0.2em]">Nombre del Bot</label>
                                <input
                                    type="text"
                                    value={settings.bot_name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({...settings, bot_name: e.target.value})}
                                    className="w-full bg-black/40 border border-app-border rounded-2xl px-5 py-4 text-sm focus:border-purple-500/50 focus:bg-black/60 outline-none transition-all text-white placeholder:text-white/20"
                                    placeholder={siteConfig.aiPlaceholder}
                                />
                            </div>

                            <div>
                                <label className="text-xs uppercase font-black text-purple-400 mb-3 block tracking-[0.2em]">System Prompt (Instrucciones de Comportamiento)</label>
                                <textarea
                                    value={settings.system_prompt}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings({...settings, system_prompt: e.target.value})}
                                    className="w-full h-64 bg-black/40 border border-app-border rounded-2xl px-5 py-4 text-sm focus:border-purple-500/50 focus:bg-black/60 outline-none resize-none transition-all text-white placeholder:text-white/20 leading-relaxed"
                                    placeholder="Ej: Eres un experto asesor financiero amable y directo..."
                                />
                                <p className="text-[10px] text-app-text-muted mt-3 italic">Define cómo debe actuar: Tono, estilo de saludo, límites, etc.</p>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Conocimiento y Reglas */}
                    <div className="space-y-6">
                        <div className="bg-black/20 p-6 rounded-3xl border border-app-border space-y-6 h-full">
                            <div>
                                <label className="text-xs uppercase font-black text-cyan-400 mb-3 block tracking-[0.2em]">Cerebro de Datos (Reglas y Conocimiento)</label>
                                <textarea
                                    value={settings.possible_responses}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings({...settings, possible_responses: e.target.value})}
                                    className="w-full h-80 bg-black/40 border border-app-border rounded-2xl px-5 py-4 text-sm focus:border-cyan-500/50 focus:bg-black/60 outline-none resize-none transition-all font-mono text-cyan-50/90 leading-relaxed scrollbar-thin"
                                    placeholder="Lista aquí tus productos, precios, horarios o reglas específicas de respuesta..."
                                />
                                <p className="text-[10px] text-app-text-muted mt-3 italic">Información técnica que el bot usará para responder preguntas específicas.</p>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-6">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-cyan-500 mb-3 block tracking-widest">🌐 Aprendizaje por URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            id="learn-url-input"
                                            type="text"
                                            placeholder="https://tu-web.com/info"
                                            className="flex-1 bg-black/40 border border-app-border rounded-xl px-4 py-3 text-xs focus:border-cyan-500/50 outline-none transition-all text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const input = document.getElementById('learn-url-input') as HTMLInputElement;
                                                const url = input?.value;
                                                if (!url) return alert('Ingresa una URL válida');
                                                
                                                setLoading(true);
                                                try {
                                                    const res = await fetch('/api/settings/learn-url', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ url })
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        alert(`¡Aprendido! Se añadieron ${data.learnedCount} caracteres.`);
                                                        const sRes = await fetch('/api/settings');
                                                        if (sRes.ok) setSettings(await sRes.json());
                                                        input.value = '';
                                                    } else {
                                                        alert('Error: ' + data.error);
                                                    }
                                                } catch (e) {
                                                    alert('Error de conexión');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-cyan-500/30"
                                        >
                                            Aprender
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">📄 Cargar Documento</p>
                                        <p className="text-[9px] text-app-text-muted italic">PDF, TXT, MD</p>
                                    </div>
                                    <label className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
                                        Seleccionar
                                        <input 
                                            type="file" 
                                            accept=".txt,.csv,.md,.pdf" 
                                            className="hidden" 
                                            onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                
                                                setLoading(true);
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
                                                    alert(`¡Archivo "${file.name}" leído!`);
                                                } catch (err) {
                                                    alert('Error leyendo archivo.');
                                                } finally {
                                                    setLoading(false);
                                                    e.target.value = '';
                                                }
                                            }} 
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-4 active:scale-[0.99] disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                    {loading ? 'SINCRONIZANDO CEREBRO...' : 'ACTUALIZAR INTELIGENCIA ARTIFICIAL'}
                </button>
            </form>
        </section>
    );
}
