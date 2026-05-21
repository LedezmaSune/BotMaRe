'use client';

import React, { useState } from 'react';
import { RefreshCw, ArrowUpCircle, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Cpu, Calendar, Clock, GitBranch } from 'lucide-react';

interface Release {
    version: string;
    date: string;
    title: string;
    type: 'major' | 'minor' | 'patch';
    description: string;
    features: string[];
}

const RELEASE_HISTORY: Release[] = [
    {
        version: 'K 1.2.0',
        date: '21 Mayo 2026',
        title: 'Actualización de Resiliencia & Soporte Humano',
        type: 'minor',
        description: 'Introduce características avanzadas de resiliencia ante caídas de WhatsApp, panel de escalado humano para chats interactivos y cola de difusión masiva optimizada.',
        features: [
            '🛡️ Centro de Soporte Técnico: Pausa automática de IA ante frustración del usuario, derivación a Telegram y chat directo con humanos.',
            '👥 Envío Multigrupo Secuencial: Solución definitiva para agregar y despachar múltiples grupos en campañas de difusión de forma continua.',
            '🔒 Motor Baileys v6.7.22: Mayor estabilidad criptográfica contra desincronización de llaves de señal (evita error 406 not-acceptable).',
            '📦 Respaldos Fraccionados: Centro de backups que divide las descargas en archivos ligeros de sistema y archivos multimedia pesados.'
        ]
    },
    {
        version: 'K 1.1.0',
        date: '15 Abril 2026',
        title: 'Modularización e Inteligencia Unificada',
        type: 'minor',
        description: 'Migración a arquitectura unificada donde el motor backend (Express) y la interfaz gráfica (Next.js) se ejecutan bajo el mismo proceso de servidor.',
        features: [
            '🧠 Cerebro AI Multi-Proveedor: Soporte y failover automático entre Groq (Llama-3), Gemini, DeepSeek, OpenAI y OpenRouter.',
            '🎨 Dashboard Glassmorphic: Interfaz moderna ultra fluida, telemetría y logs de consola en tiempo real.',
            '✈️ Bot de Telegram Integrado: Alertas instantáneas y comandos interactivos como /status para reiniciar o pausar la IA remotamente.'
        ]
    },
    {
        version: 'K 1.0.0',
        date: '01 Enero 2026',
        title: 'Lanzamiento Inicial BotMaRe',
        type: 'major',
        description: 'Primera versión de producción de la plataforma de automatización de WhatsApp e IA.',
        features: [
            '📱 Conector Base de WhatsApp: Sincronización nativa de chats, perfiles y grupos.',
            '📅 Planificador de Recordatorios: Envío programado de mensajes de texto y archivos multimedia recurrentes.',
            '📊 Calendario Interactivo: Visualización mensual y semanal con capacidad de agendado inmediato.'
        ]
    }
];

export function UpdateCenter() {
    const [checking, setChecking] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [expandedVersion, setExpandedVersion] = useState<string | null>('K 1.2.0');

    const handleCheckUpdate = async () => {
        setChecking(true);
        setUpdateInfo(null);
        try {
            const res = await fetch('/api/system/check-update');
            if (res.ok) {
                const data = await res.json();
                setUpdateInfo(data);
            } else {
                setUpdateInfo({ error: 'No se pudo contactar al servidor de actualizaciones.' });
            }
        } catch (e: any) {
            setUpdateInfo({ error: e.message || 'Error en la conexión.' });
        } finally {
            setChecking(false);
        }
    };

    const handleApplyUpdate = async () => {
        if (!confirm('¿Quieres aplicar la actualización? Esto traerá la última versión del repositorio, sobreescribirá cambios locales no confirmados y reiniciará el servidor de BotMaRe.')) return;
        setUpdating(true);
        try {
            const res = await fetch('/api/system/apply-update', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('¡Actualización aplicada con éxito! El sistema se está reiniciando en segundo plano.');
            } else {
                alert(`Error al actualizar: ${data.error || 'Desconocido'}`);
            }
        } catch (e: any) {
            alert(`Error al aplicar la actualización: ${e.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const toggleVersion = (version: string) => {
        setExpandedVersion(expandedVersion === version ? null : version);
    };

    return (
        <section className="glass-effect border border-app-border rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-5xl mx-auto shadow-[0_32px_64px_rgba(0,0,0,0.2)] relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

            {/* Header */}
            <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-12 relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-white shadow-[0_15px_30px_rgba(6,182,212,0.3)] transform -rotate-2 hover:rotate-0 transition-all duration-500 relative">
                    <RefreshCw className={`w-8 h-8 md:w-10 md:h-10 ${checking ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-app-text tracking-tighter leading-tight">Centro de Actualizaciones</h2>
                    <p className="text-app-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mt-1 opacity-70">Control de Versiones y Ciclo de Vida del Motor Kitsune</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Left side: Version Status Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-100/40 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">Versión Activa</span>
                                <h3 className="text-4xl font-black text-app-text mt-3 tracking-tighter">K 1.2.0</h3>
                            </div>
                            <Cpu className="text-app-text-muted/30 w-10 h-10 group-hover:text-cyan-500/50 transition-colors duration-500" />
                        </div>

                        <div className="flex items-center gap-2 mt-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold">
                            <CheckCircle2 size={16} className="shrink-0" />
                            <span>Sistema Actualizado & Estable</span>
                        </div>

                        <div className="mt-8 space-y-3 pt-6 border-t border-slate-200 dark:border-white/5 text-[10px] font-bold uppercase text-app-text-muted/70 tracking-wider">
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><Calendar size={12} /> Lanzamiento:</span>
                                <span className="text-app-text">21 Mayo 2026</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><Clock size={12} /> Último Check:</span>
                                <span className="text-app-text">Hoy (Hace instantes)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><GitBranch size={12} /> Rama Activa:</span>
                                <span className="text-cyan-500 lowercase font-mono">origin/main</span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCheckUpdate}
                            disabled={checking || updating}
                            className="w-full py-4 bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-app-text rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-300 dark:border-slate-700/50 flex items-center justify-center gap-3 disabled:opacity-40"
                        >
                            {checking ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            {checking ? 'Buscando...' : 'Buscar Actualización'}
                        </button>

                        {updateInfo && (
                            <div className="bg-slate-100/40 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 text-xs space-y-4 animate-in slide-in-from-top-3 duration-500">
                                {updateInfo.error ? (
                                    <div className="flex gap-2 text-red-500 font-bold items-start">
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        <span>Error: {updateInfo.error}</span>
                                    </div>
                                ) : updateInfo.updateAvailable ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-2.5 text-cyan-500 font-black items-start">
                                            <ArrowUpCircle size={18} className="shrink-0 mt-0.5 animate-bounce" />
                                            <div>
                                                <p className="uppercase tracking-widest text-[10px]">¡Actualización Disponible!</p>
                                                <p className="text-app-text mt-1">Versión remota superior o cambios no aplicados.</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-200/50 dark:bg-slate-900/50 p-3 rounded-xl font-mono text-[10px] space-y-1 text-app-text-muted">
                                            <div className="flex justify-between">
                                                <span>Commit Local:</span>
                                                <span className="text-app-text">{updateInfo.localCommit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Commit Remoto:</span>
                                                <span className="text-cyan-400">{updateInfo.remoteCommit}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleApplyUpdate}
                                            disabled={updating}
                                            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                                        >
                                            {updating ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                                            {updating ? 'Instalando...' : 'Aplicar Actualización'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2.5 text-emerald-500 font-bold items-start">
                                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="uppercase tracking-widest text-[10px]">Al día</p>
                                            <p className="text-app-text-muted mt-1">Tu instalación coincide plenamente con la última versión de GitHub.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Release Changelog Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-black text-app-text tracking-tight flex items-center gap-3">
                        Historial de Cambios
                        <span className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-app-border">
                            {RELEASE_HISTORY.length} Versiones
                        </span>
                    </h3>

                    <div className="relative border-l border-slate-200 dark:border-white/10 pl-6 ml-4 space-y-8 py-2">
                        {RELEASE_HISTORY.map((release) => {
                            const isExpanded = expandedVersion === release.version;
                            const isLatest = release.version === 'K 1.2.0';

                            return (
                                <div key={release.version} className="relative">
                                    {/* Timeline Circle Bullet */}
                                    <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background transition-colors ${isLatest ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'border-slate-400'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${isLatest ? 'bg-cyan-500 animate-pulse' : 'bg-slate-400'}`} />
                                    </span>

                                    {/* Collapsible Card */}
                                    <div className={`bg-app-card border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${isExpanded ? 'border-cyan-500/40 ring-1 ring-cyan-500/10' : 'border-app-border hover:border-app-border-hover'}`}>
                                        {/* Card Header Trigger */}
                                        <div 
                                            onClick={() => toggleVersion(release.version)}
                                            className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                                        >
                                            <div className="space-y-1 pr-4">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h4 className="text-base font-black text-app-text tracking-tight uppercase">{release.version}</h4>
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                        release.type === 'major' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                        release.type === 'minor' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                    }`}>
                                                        {release.type === 'major' ? 'Major Release' : release.type === 'minor' ? 'Minor Update' : 'Patch'}
                                                    </span>
                                                    {isLatest && (
                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded shadow-sm">
                                                            Activa
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-cyan-500 dark:text-cyan-400 tracking-tight leading-tight">{release.title}</p>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0 text-app-text-muted">
                                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{release.date}</span>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {/* Collapsible Content */}
                                        {isExpanded && (
                                            <div className="px-5 pb-6 pt-2 border-t border-app-border bg-slate-50/20 dark:bg-slate-950/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <p className="text-xs text-app-text-muted leading-relaxed font-medium">
                                                    {release.description}
                                                </p>
                                                
                                                <div className="space-y-2 pt-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-app-text-muted/60">Lista de Ajustes & Funciones:</p>
                                                    <ul className="space-y-2">
                                                        {release.features.map((feat, i) => (
                                                            <li key={i} className="text-xs font-bold text-app-text leading-relaxed flex items-start gap-2.5">
                                                                <span className="text-cyan-500 mt-1 shrink-0 text-[10px]">•</span>
                                                                <span>{feat}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
