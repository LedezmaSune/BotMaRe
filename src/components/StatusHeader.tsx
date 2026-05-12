'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, Loader2, RefreshCw, Sun, Moon, Brain } from 'lucide-react';
import { ConnectionState } from '../types';
import { useGlobalBotData } from '@/app/BotDataProvider';

export function GlobalClock() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex flex-col items-center justify-center bg-app-card/30 border border-app-border/50 px-4 py-1.5 rounded-2xl shadow-inner">
            <h2 className="text-sm font-black text-app-text tabular-nums tracking-widest uppercase">
                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p className="text-[8px] font-bold text-cyan-500 uppercase tracking-[0.2em] -mt-0.5">
                {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
        </div>
    );
}

export function AIToggle() {
    const { settings, handleUpdateSettings } = useGlobalBotData();
    const isEnabled = settings?.AI_ENABLED !== 'false';

    const toggle = async () => {
        if (!settings) return;
        const newValue = isEnabled ? 'false' : 'true';
        await handleUpdateSettings({ ...settings, AI_ENABLED: newValue });
    };

    return (
        <button 
            onClick={toggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                isEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
            }`}
            title={isEnabled ? "IA Activada - El bot responderá automáticamente" : "IA Desactivada - Modo Humano (No auto-respuestas)"}
        >
            <Brain size={14} className={isEnabled ? 'animate-pulse' : ''} />
            <span>{isEnabled ? 'IA ON' : 'IA OFF'}</span>
        </button>
    );
}

interface StatusHeaderProps {
    status: ConnectionState;
    qr: string | null;
    onCleanUploads: () => void;
    botName?: string;
}

export function StatusHeader({ status, qr, onCleanUploads, botName }: StatusHeaderProps) {
    void qr;
    void status;
    void onCleanUploads;
    void botName;
    // El contenido ahora se maneja desde el Header global en page.tsx
    return null;
}

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        const initial = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setIsDark(initial);
        if (initial) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, []);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        const theme = next ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };

    return (
        <button 
            onClick={toggle}
            className="p-2.5 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all active:scale-95"
            title={isDark ? "Modo Claro" : "Modo Oscuro"}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}

export function UpdateChecker() {
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [checking, setChecking] = useState(false);

    const check = async () => {
        setChecking(true);
        try {
            const res = await fetch('/api/system/check-update');
            const data = await res.json();
            setUpdateInfo(data);
        } catch (e) {
            console.error(e);
        } finally {
            setChecking(false);
        }
    };

    const apply = async () => {
        if (!confirm('¿Quieres aplicar la actualización? Esto sobreescribirá cambios locales y reiniciará el bot.')) return;
        try {
            const res = await fetch('/api/system/apply-update', { method: 'POST' });
            const data = await res.json();
            alert(data.message || data.error);
        } catch (e) {
            alert('Error al aplicar actualización');
        }
    };

    if (updateInfo?.updateAvailable) {
        return (
            <button 
                onClick={apply}
                className="flex items-center gap-2 px-4 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/30 transition-all animate-pulse"
            >
                ¡Actualización Disponible!
            </button>
        );
    }

    return (
        <button 
            onClick={check}
            disabled={checking}
            className="p-2.5 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all active:scale-95"
            title="Buscar actualizaciones"
        >
            {checking ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
    );
}
