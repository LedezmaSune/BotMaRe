'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Activity, Server, Cpu, HardDrive, RefreshCw, CheckCircle2, MessageSquareOff, Terminal } from 'lucide-react';
import { useGlobalBotData } from '@/app/BotDataProvider';
import io from 'socket.io-client';

export function SupportDashboard() {
    const { status } = useGlobalBotData();
    const [pausedChats, setPausedChats] = useState<any[]>([]);
    const [health, setHealth] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [chatsRes, healthRes, logsRes] = await Promise.all([
                fetch('/api/support/paused-chats'),
                fetch('/api/support/health'),
                fetch('/api/support/logs')
            ]);
            
            if (chatsRes.ok) setPausedChats(await chatsRes.json());
            if (healthRes.ok) setHealth(await healthRes.json());
            if (logsRes.ok) setLogs(await logsRes.json());
        } catch (e) {
            console.error("Error fetching support data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Polling health every 10 seconds
        const healthInterval = setInterval(() => {
            fetch('/api/support/health').then(res => res.json()).then(setHealth).catch(() => {});
        }, 10000);

        // Listen for socket events
        const socket = io();
        socket.on('support_alert', (data) => {
            // New ticket! Refresh data
            fetchData();
        });

        return () => {
            clearInterval(healthInterval);
            socket.disconnect();
        };
    }, []);

    const handleUnpause = async (chatId: string) => {
        if (!confirm('¿Reactivar la inteligencia artificial para este chat?')) return;
        try {
            const res = await fetch('/api/support/unpause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId })
            });
            if (res.ok) {
                setPausedChats(prev => prev.filter(c => c.chatId !== chatId));
            }
        } catch (e) {
            alert("Error al reactivar IA");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <RefreshCw className="animate-spin text-cyan-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-app-card/30 border border-app-border rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                            <ShieldAlert className="text-cyan-400" size={32} />
                            Centro de Soporte
                        </h1>
                        <p className="text-app-text-muted mt-2 text-sm font-medium">
                            Gestión de escalado humano, monitorización del servidor y visor de auditoría en vivo.
                        </p>
                    </div>
                    <button 
                        onClick={fetchData}
                        className="flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl transition-all font-bold tracking-widest text-[10px] uppercase shadow-lg shadow-cyan-500/10 active:scale-95"
                    >
                        <RefreshCw size={14} />
                        Actualizar Datos
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Columna Izquierda: Servidor y Telemetría */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Tarjeta de Servidor */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-app-card/50 border border-app-border rounded-3xl p-6 backdrop-blur-xl shadow-xl shadow-black/20"
                    >
                        <div className="flex items-center gap-3 mb-6 border-b border-app-border/50 pb-4">
                            <Activity className="text-emerald-400" size={24} />
                            <h2 className="text-lg font-black tracking-wide">Telemetría</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-app-text-muted uppercase tracking-wider">
                                    <span className="flex items-center gap-2"><Cpu size={14}/> CPU Load</span>
                                    <span className="text-app-text">{health?.cpu ? health.cpu.toFixed(2) : '0'}%</span>
                                </div>
                                <div className="w-full bg-app-card border border-app-border rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 h-full rounded-full" style={{ width: `${Math.min(100, (health?.cpu || 0) * 10)}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-app-text-muted uppercase tracking-wider">
                                    <span className="flex items-center gap-2"><Server size={14}/> Memoria RAM</span>
                                    <span className="text-app-text">{health?.memory ? `${(health.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB / ${(health.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB` : '0'}</span>
                                </div>
                                <div className="w-full bg-app-card border border-app-border rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full" style={{ width: `${health?.memory?.percentage || 0}%` }}></div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-app-text-muted uppercase tracking-wider">
                                    <span className="flex items-center gap-2"><HardDrive size={14}/> Uptime</span>
                                    <span className="text-app-text">{health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : '0h 0m'}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Visor de Consola Miniatura */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-black/90 border border-app-border rounded-3xl p-6 shadow-xl shadow-black/40 h-80 flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-4 text-app-text-muted">
                            <Terminal size={18} />
                            <span className="text-xs font-mono font-bold uppercase tracking-wider">Últimas Acciones</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-2 pr-2">
                            {logs.map((log: any, i) => (
                                <div key={i} className="flex gap-3 text-app-text-muted/80 break-words">
                                    <span className="text-cyan-500/50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={log.action.includes('ERROR') || log.action.includes('FAIL') ? 'text-red-400' : 'text-emerald-400'}>{log.action}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Columna Derecha: Tickets / Escalados Humanos */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-app-card/50 border border-app-border rounded-3xl p-8 backdrop-blur-xl shadow-xl shadow-black/20 min-h-full">
                        <div className="flex items-center justify-between mb-8 border-b border-app-border/50 pb-4">
                            <div className="flex items-center gap-3">
                                <MessageSquareOff className="text-indigo-400" size={28} />
                                <div>
                                    <h2 className="text-xl font-black tracking-wide">Atención Humana Pendiente</h2>
                                    <p className="text-xs text-app-text-muted font-medium mt-1">Chats pausados esperando intervención manual</p>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-app-card rounded-full border border-app-border">
                                <span className="text-xs font-bold font-mono text-cyan-400">{pausedChats.length} Tickets</span>
                            </div>
                        </div>

                        {pausedChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle2 className="text-emerald-500" size={40} />
                                </div>
                                <h3 className="text-xl font-bold">Todo está bajo control</h3>
                                <p className="text-sm text-app-text-muted max-w-sm">No hay clientes esperando atención manual en este momento. La IA se encarga de todo.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pausedChats.map((chat) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={chat.chatId} 
                                        className="bg-app-card/80 border border-app-border hover:border-cyan-500/30 p-5 rounded-2xl transition-all group shadow-sm hover:shadow-cyan-500/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                <h3 className="font-bold text-lg truncate">{chat.chatId.replace('@s.whatsapp.net', '')}</h3>
                                            </div>
                                            <p className="text-sm text-app-text-muted mb-2"><strong className="text-app-text">Motivo:</strong> {chat.reason}</p>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-500/70">
                                                Pausado hasta: {new Date(chat.pausedUntil).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleUnpause(chat.chatId)}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-app-card border border-app-border hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                                        >
                                            Reactivar IA
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
