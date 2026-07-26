'use client';

import { useState, useEffect } from 'react';
import { Activity, Zap, Server, MessageSquare, BarChart, Clock } from 'lucide-react';

export function TelemetryUI() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                const res = await fetch('/api/system/telemetry');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error('Error fetching telemetry:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return <div className="text-center py-20 text-app-text-muted animate-pulse">Cargando Telemetría...</div>;
    }

    if (!data) {
        return <div className="text-center py-20 text-red-500">Error cargando telemetría.</div>;
    }

    return (
        <section className="bg-app-card border border-app-border rounded-3xl p-6 lg:p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center gap-5 mb-10 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center text-cyan-400 shadow-xl border border-cyan-500/30">
                    <Activity size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-app-text tracking-tight">Telemetría Global</h2>
                    <p className="text-app-text-muted text-xs font-bold uppercase tracking-widest opacity-60">Monitoreo de Recursos en Tiempo Real</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 mb-10">
                {/* Total Tokens */}
                <div className="bg-app-bg dark:bg-slate-900/60 p-6 rounded-3xl border border-app-border shadow-lg">
                    <div className="flex items-center gap-3 mb-4 text-emerald-400">
                        <Zap size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Tokens Consumidos</span>
                    </div>
                    <p className="text-4xl font-black text-app-text">{data.llm?.totalTokens.toLocaleString() || 0}</p>
                    <p className="text-xs text-app-text-muted mt-2">En todos los proveedores</p>
                </div>

                {/* Avg Latency */}
                <div className="bg-app-bg dark:bg-slate-900/60 p-6 rounded-3xl border border-app-border shadow-lg">
                    <div className="flex items-center gap-3 mb-4 text-amber-400">
                        <Clock size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Latencia Media IA</span>
                    </div>
                    <p className="text-4xl font-black text-app-text">
                        {data.llm?.totalRequests > 0 ? Math.round(data.llm.totalLatencyMs / data.llm.totalRequests) : 0}
                        <span className="text-xl text-app-text-muted ml-1">ms</span>
                    </p>
                    <p className="text-xs text-app-text-muted mt-2">Tiempo de respuesta global</p>
                </div>

                {/* Mensajes Baileys */}
                <div className="bg-app-bg dark:bg-slate-900/60 p-6 rounded-3xl border border-app-border shadow-lg">
                    <div className="flex items-center gap-3 mb-4 text-indigo-400">
                        <MessageSquare size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Estado WhatsApp</span>
                    </div>
                    <p className="text-2xl font-black text-app-text mb-1">
                        Desconexiones: <span className="text-red-400">{data.baileys?.disconnects || 0}</span>
                    </p>
                    <p className="text-2xl font-black text-app-text">
                        Reconexiones: <span className="text-emerald-400">{data.baileys?.reconnects || 0}</span>
                    </p>
                </div>
            </div>

            <div className="bg-app-bg dark:bg-slate-900/40 p-6 rounded-3xl border border-app-border">
                <div className="flex items-center gap-3 mb-6 text-app-text">
                    <BarChart size={20} className="text-cyan-400" />
                    <h3 className="text-lg font-black tracking-tight">Desglose por Proveedor</h3>
                </div>
                <div className="space-y-4">
                    {Object.keys(data.llm?.providerStats || {}).map(provider => {
                        const stats = data.llm.providerStats[provider];
                        return (
                            <div key={provider} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-app-card/50 rounded-2xl border border-app-border/50">
                                <span className="font-bold text-app-text mb-2 md:mb-0">{provider}</span>
                                <div className="flex flex-wrap gap-4 text-sm font-mono">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-emerald-600 dark:text-emerald-400">
                                        Tokens: {stats.tokens.toLocaleString()}
                                    </span>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400">
                                        Peticiones: {stats.requests.toLocaleString()}
                                    </span>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-amber-600 dark:text-amber-400">
                                        Avg: {Math.round(stats.latencyMs / stats.requests)}ms
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {Object.keys(data.llm?.providerStats || {}).length === 0 && (
                        <p className="text-app-text-muted italic">No hay datos de proveedores registrados aún.</p>
                    )}
                </div>
            </div>
        </section>
    );
}
