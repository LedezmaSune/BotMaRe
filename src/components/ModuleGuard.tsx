'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Sparkles } from 'lucide-react';
import { useGlobalBotData } from '@/app/BotDataProvider';

interface ModuleGuardProps {
    moduleId: string;
    moduleName?: string;
    children: React.ReactNode;
}

export function ModuleGuard({ moduleId, moduleName, children }: ModuleGuardProps) {
    const { isModuleEnabled, licensingState } = useGlobalBotData();

    // Si el módulo está habilitado, renderizar el contenido normalmente
    if (isModuleEnabled(moduleId)) {
        return <>{children}</>;
    }

    const title = moduleName || moduleId.toUpperCase();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 sm:p-12 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <ShieldAlert size={40} />
            </div>

            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 inline-flex items-center gap-1.5">
                <Sparkles size={12} /> Plan {licensingState?.plan || 'Básico'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
                Módulo <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{title}</span> no disponible
            </h2>

            <p className="text-sm text-app-text-muted max-w-md mb-8 leading-relaxed">
                Esta función requiere un plan superior o no ha sido habilitada para esta instancia. Contacta a tu proveedor de servicio para desbloquear este módulo.
            </p>

            <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-cyan-500/10"
            >
                <ArrowLeft size={16} /> Volver al Inicio
            </Link>
        </div>
    );
}
