'use client';

import { BookOpen, Rocket, Zap, Brain, ShieldCheck, History, ArrowRight } from 'lucide-react';

export default function ManualPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="mb-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-cyan-500/20">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-app-text tracking-tighter">Manual de Usuario</h1>
                        <p className="text-app-text-muted font-bold text-sm tracking-widest uppercase">BotMaRe AI 2026</p>
                    </div>
                </div>
                <p className="text-app-text-muted/80 max-w-2xl leading-relaxed mt-4">
                    Bienvenido al centro de conocimiento de BotMaRe. Este manual te guiará para dominar 
                    las herramientas de automatización, inteligencia artificial y envíos masivos.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asistente Inteligente */}
                <section className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -mr-10 -mt-10 transition-all group-hover:bg-purple-500/10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="text-purple-500" size={24} />
                        <h2 className="text-xl font-black text-app-text tracking-tight">Asistente Masivo (Smart Lote)</h2>
                    </div>
                    <div className="space-y-4 text-sm text-app-text-muted">
                        <p>La carga masiva lee los nombres de tus archivos para auto-programarlos sin esfuerzo.</p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-purple-400 shrink-0 mt-0.5" />
                                <span><b>Detección de Año:</b> Renombra tus archivos como <code className="text-purple-400 font-black">11-05.jpg</code> o <code className="text-purple-400 font-black">1105.jpg</code> y el sistema asumirá automáticamente que es para el año actual.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-purple-400 shrink-0 mt-0.5" />
                                <span><b>Año Explícito:</b> Puedes usar <code className="text-purple-400 font-black">11-05-2026.jpg</code> si necesitas programar para años futuros.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-purple-400 shrink-0 mt-0.5" />
                                <span><b>Variables:</b> Usa la etiqueta <code className="text-purple-400 font-black">{"{ARCHIVO}"}</code> en tu mensaje global. El bot reemplazará esta etiqueta por el nombre real de cada foto enviada.</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Cerebro IA */}
                <section className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -mr-10 -mt-10 transition-all group-hover:bg-cyan-500/10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Brain className="text-cyan-500" size={24} />
                        <h2 className="text-xl font-black text-app-text tracking-tight">Cerebro IA y Tono</h2>
                    </div>
                    <div className="space-y-4 text-sm text-app-text-muted">
                        <p>Educa a tu bot para que suene exactamente como tu marca y siga tus reglas de negocio.</p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span><b>Contexto:</b> Define la personalidad. Ej: "Eres Sofía, experta en ventas. Sé amable pero concisa".</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span><b>Reglas Estrictas:</b> Ordena restricciones claras. Ej: "Nunca ofrezcas descuentos". El bot jamás romperá esta regla.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span><b>Switch Manual (IA OFF):</b> Usa el botón superior de <b className="text-amber-500">IA OFF</b> cuando necesites tomar el control manual del WhatsApp sin que el bot responda automáticamente.</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Resiliencia */}
                <section className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldCheck className="text-emerald-500" size={24} />
                        <h2 className="text-xl font-black text-app-text tracking-tight">Estabilidad y Bloqueos</h2>
                    </div>
                    <div className="space-y-4 text-sm text-app-text-muted">
                        <p>Tu sistema incluye blindaje empresarial anti-caídas.</p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span><b>Rate-Overlimit:</b> El bot tiene una caché de memoria avanzada. Si pides muchos grupos a la vez, recicla la memoria para evitar que WhatsApp te bloquee la cuenta.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span><b>Auto-Fix:</b> Si mueves la carpeta del proyecto a otra computadora, el sistema buscará las fotos perdidas y reconstruirá los enlaces solo.</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Difusión Individual */}
                <section className="bg-app-card border border-app-border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full -mr-10 -mt-10 transition-all group-hover:bg-pink-500/10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Rocket className="text-pink-500" size={24} />
                        <h2 className="text-xl font-black text-app-text tracking-tight">Difusión y Varita Mágica</h2>
                    </div>
                    <div className="space-y-4 text-sm text-app-text-muted">
                        <p>Optimiza tus mensajes manuales con la integración de DeepSeek.</p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-pink-400 shrink-0 mt-0.5" />
                                <span><b>Corrección AI:</b> Escribe un mensaje feo o con mala ortografía, presiona el botón <b className="text-pink-400">Varita Mágica</b> en el redactor y la IA lo convertirá en un texto persuasivo en 1 segundo.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight size={16} className="text-pink-400 shrink-0 mt-0.5" />
                                <span><b>Envío Inmediato:</b> Todos los recordatorios agendados tienen un botón para forzar su envío ahora mismo si urge despacharlos.</span>
                            </li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
}
