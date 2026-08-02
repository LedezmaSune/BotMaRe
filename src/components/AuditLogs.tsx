'use client';

import { useState } from 'react';
import { History, ChevronDown, ChevronUp, CheckCircle2, XCircle, Info, Send, User, MessageSquare, AlertCircle } from 'lucide-react';
import { Audit } from '../types';

interface AuditLogsProps {
    audits: Audit[];
}

export function AuditLogs({ audits }: AuditLogsProps) {
    const [expandedId, setExpandedId] = useState<number | string | null>(null);

    return (
        <section className="bg-app-card border border-app-border rounded-3xl p-6 lg:p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl min-h-[700px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center gap-5 mb-10 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-slate-200 dark:from-slate-800 to-slate-300 dark:to-slate-900 rounded-2xl flex items-center justify-center text-slate-600 dark:text-cyan-400 shadow-xl border border-app-border/50">
                    <History size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-app-text tracking-tight">Registro de Auditoría</h2>
                    <p className="text-app-text-muted text-xs font-bold uppercase tracking-widest opacity-60">Control total de actividades y campañas</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {audits.map((a, index) => {
                    const uniqueId = a.id || `audit-${index}`;
                    const isExpanded = expandedId === uniqueId;
                    const isCampaign = a.action === 'MASS_DIFFUSION_CAMPAIGN';
                    let details: any = {};
                    try { details = JSON.parse(a.details); } catch (e) { details = { text: a.details }; }

                    // Format date nicely
                    let formattedDate = a.timestamp;
                    try {
                        const dateObj = new Date(a.timestamp);
                        if (!isNaN(dateObj.getTime())) {
                            formattedDate = dateObj.toLocaleString('es-MX', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                            }).toUpperCase();
                        }
                    } catch(e) {}

                    return (
                        <div key={uniqueId} className={`bg-app-bg dark:bg-slate-950/40 border rounded-3xl transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/5' : 'border-app-border hover:border-slate-400/30'}`}>
                            {/* Header del Log */}
                            <div 
                                onClick={() => setExpandedId(isExpanded ? null : uniqueId)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${
                                        a.action.includes('SENT') || a.action.includes('SUCCESS') || details.success > 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                        a.action.includes('FAILED') || a.action.includes('ERROR') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                    }`} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">{formattedDate}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black uppercase tracking-widest ${isCampaign ? 'text-indigo-400' : 'text-app-text'}`}>
                                                {isCampaign ? '🚀 Difusión Masiva' : a.action.replace(/_/g, ' ')}
                                            </span>
                                            {isCampaign && (
                                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-black">CAMPAÑA</span>
                                            )}
                                            {details.channel === 'sms' && (
                                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-full text-[9px] font-black flex items-center gap-1">
                                                    SMS
                                                </span>
                                            )}
                                            {(details.channel === 'whatsapp' || (!details.channel && a.action.includes('REMINDER'))) && (
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black flex items-center gap-1">
                                                    WhatsApp
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 mt-4 sm:mt-0">
                                    {isCampaign && (
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-black text-emerald-500">{details.success} ÉXITOS</span>
                                                <span className="text-[9px] font-black text-red-400">{details.failed} FALLOS</span>
                                            </div>
                                            <div className="w-px h-6 bg-app-border/50"></div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                            @{a.userId}
                                        </span>
                                        <div className="text-app-text-muted group-hover:text-cyan-400 transition-colors ml-2">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detalle Expandido */}
                            {isExpanded && (
                                <div className="p-6 border-t border-app-border bg-app-card/30 animate-in slide-in-from-top-2 duration-300">
                                    {isCampaign ? (
                                        <div className="space-y-6">
                                            {/* Resumen de Campaña */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-app-bg dark:bg-slate-900/60 p-4 rounded-2xl border border-app-border">
                                                    <div className="flex items-center gap-2 mb-2 text-app-text-muted">
                                                        <Send size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Total Enviados</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-app-text">{details.total}</p>
                                                </div>
                                                <div className="bg-app-bg dark:bg-slate-900/60 p-4 rounded-2xl border border-app-border">
                                                    <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                                        <CheckCircle2 size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Entregados</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-emerald-500">{details.success}</p>
                                                </div>
                                                <div className="bg-app-bg dark:bg-slate-900/60 p-4 rounded-2xl border border-app-border">
                                                    <div className="flex items-center gap-2 mb-2 text-red-400">
                                                        <XCircle size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">No Entregados</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-red-400">{details.failed}</p>
                                                </div>
                                            </div>

                                            {/* Mensaje Enviado */}
                                            <div className="bg-app-bg dark:bg-slate-900/60 p-5 rounded-2xl border border-app-border relative">
                                                <div className="flex items-center gap-2 mb-3 text-app-text-muted">
                                                    <MessageSquare size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Mensaje de la Campaña</span>
                                                </div>
                                                <p className="text-sm text-app-text italic whitespace-pre-wrap leading-relaxed opacity-80">
                                                    "{details.message}"
                                                </p>
                                            </div>

                                            {/* Listado de Destinatarios */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4 text-app-text-muted">
                                                    <User size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Bitácora de Destinatarios</span>
                                                </div>
                                                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                                    {details.details?.map((log: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-app-bg dark:bg-slate-900/40 rounded-xl border border-app-border/50 hover:border-app-border transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                    {log.name?.charAt(0) || 'U'}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-app-text">{log.name || 'Sin Nombre'}</span>
                                                                    <span className="text-[9px] font-mono text-app-text-muted">{log.number}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[9px] font-bold text-app-text-muted opacity-50">{log.time}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {log.status === 'success' ? (
                                                                        <span className="text-sm">✅</span>
                                                                    ) : (
                                                                        <span className="text-sm">❌</span>
                                                                    )}
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${log.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                        {log.status === 'success' ? 'Entregado' : 'No Entregado'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : a.action.includes('REMINDER') ? (
                                        <div className="bg-app-bg dark:bg-slate-900/40 p-6 rounded-2xl border border-app-border">
                                            <div className="flex items-center gap-2 mb-5">
                                                <CheckCircle2 size={16} className="text-cyan-400" />
                                                <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Estado del Recordatorio</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1 p-4 bg-app-card/30 dark:bg-slate-950/30 rounded-xl border border-app-border/50">
                                                    <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest">ID del Evento</span>
                                                    <span className="text-sm font-mono font-bold text-app-text">{details.id || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 p-4 bg-app-card/30 dark:bg-slate-950/30 rounded-xl border border-app-border/50">
                                                    <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest">Destinatario</span>
                                                    <span className="text-sm font-mono font-bold text-app-text">{details.to || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 p-4 bg-app-card/30 dark:bg-slate-950/30 rounded-xl border border-app-border/50">
                                                    <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest">Canal</span>
                                                    <span className={`text-sm font-black uppercase tracking-widest ${details.channel === 'sms' ? 'text-purple-500' : 'text-emerald-500'}`}>{details.channel === 'sms' ? 'SMS' : 'WhatsApp'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 p-4 bg-app-card/30 dark:bg-slate-950/30 rounded-xl border border-app-border/50">
                                                    <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest">Tipo de Contenido</span>
                                                    <span className="text-sm font-bold text-app-text capitalize">{details.type || 'Texto'}</span>
                                                </div>
                                                {details.error && (
                                                    <div className="col-span-1 md:col-span-2 flex flex-col gap-1 p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={10} /> Error Reportado</span>
                                                        <span className="text-sm font-mono text-red-400">{details.error}</span>
                                                    </div>
                                                )}
                                                {details.delay && (
                                                    <div className="col-span-1 md:col-span-2 flex flex-col gap-1 p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={10} /> Retraso Detectado</span>
                                                        <span className="text-sm font-mono text-amber-500">Omitido por exceder {details.delay} minutos.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-app-bg dark:bg-slate-900/40 p-6 rounded-2xl border border-app-border">
                                            <div className="flex items-center gap-2 mb-5">
                                                <Info size={16} className="text-cyan-400" />
                                                <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Información Detallada</span>
                                            </div>
                                            <div className="flex flex-col rounded-xl border border-app-border/50 bg-app-card/30 dark:bg-slate-950/30 overflow-hidden divide-y divide-app-border/50">
                                                {typeof details === 'object' && details !== null ? (
                                                    Object.entries(details).map(([key, value], idx) => (
                                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-start sm:items-center p-3 hover:bg-slate-500/5 transition-colors">
                                                            <span className="sm:w-1/3 text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 sm:mb-0">{key}</span>
                                                            <span className="sm:w-2/3 text-xs font-mono font-medium text-app-text break-words">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4">
                                                        <p className="text-sm text-app-text opacity-80">{String(details)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {audits.length === 0 && (
                    <div className="py-20 text-center bg-app-bg dark:bg-slate-950/20 rounded-3xl border-2 border-dashed border-app-border">
                        <AlertCircle size={48} className="mx-auto mb-4 text-app-text-muted opacity-20" />
                        <p className="text-app-text-muted font-bold uppercase text-xs tracking-widest">No hay registros de auditoría aún</p>
                    </div>
                )}
            </div>
        </section>
    );
}
