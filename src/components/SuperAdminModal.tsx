'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, Key, Lock, CheckCircle2, AlertCircle, X, 
    Sparkles, Save, Layers, Check, RefreshCw 
} from 'lucide-react';
import { useGlobalBotData } from '@/app/BotDataProvider';
import { ALL_MODULES, PLAN_PRESETS, PlanType } from '@/types/licensing';

interface SuperAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SuperAdminModal({ isOpen, onClose }: SuperAdminModalProps) {
    const { licensingState, handleUpdateLicensing } = useGlobalBotData();
    const [masterKey, setMasterKey] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const [selectedPlan, setSelectedPlan] = useState<PlanType>('ENTERPRISE');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Sincronizar estado cuando se abre el modal o cambia licensingState
    useEffect(() => {
        if (licensingState) {
            setSelectedPlan(licensingState.plan || 'ENTERPRISE');
            setSelectedModules(licensingState.enabledModules || ALL_MODULES.map(m => m.id));
        }
    }, [licensingState, isOpen]);

    // Manejar verificación de la Clave Maestra
    const handleVerifyKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!masterKey.trim()) return;

        setIsVerifying(true);
        setAuthError('');
        try {
            const res = await fetch('/api/licensing/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterKey: masterKey.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setIsAuthenticated(true);
            } else {
                setAuthError(data.message || 'Clave maestra incorrecta');
            }
        } catch (err: any) {
            setAuthError('Error al conectar con el servidor');
        } finally {
            setIsVerifying(false);
        }
    };

    // Aplicar preset de Plan
    const handleSelectPlanPreset = (plan: PlanType) => {
        setSelectedPlan(plan);
        if (plan !== 'CUSTOM' && PLAN_PRESETS[plan]) {
            setSelectedModules([...PLAN_PRESETS[plan]]);
        }
    };

    // Toggle individual de un módulo
    const handleToggleModule = (moduleId: string) => {
        setSelectedPlan('CUSTOM');
        if (selectedModules.includes(moduleId)) {
            // Evitar desactivar todo
            if (selectedModules.length <= 1) return;
            setSelectedModules(selectedModules.filter(id => id !== moduleId));
        } else {
            setSelectedModules([...selectedModules, moduleId]);
        }
    };

    // Guardar cambios
    const handleSave = async () => {
        setIsSaving(true);
        setStatusMessage(null);

        const result = await handleUpdateLicensing(masterKey, selectedPlan, selectedModules);
        setIsSaving(false);

        if (result.success) {
            setStatusMessage({ type: 'success', text: 'Licencia y módulos actualizados correctamente' });
            setTimeout(() => {
                setStatusMessage(null);
            }, 3500);
        } else {
            setStatusMessage({ type: 'error', text: result.message || 'Error al guardar cambios' });
        }
    };

    const handleClose = () => {
        setStatusMessage(null);
        setAuthError('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-2xl bg-[#0d131f] border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden z-10 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-app-border/40 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-background to-blue-950/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-lg text-white tracking-tight">SuperAdmin</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                            Control de Licencia
                                        </span>
                                    </div>
                                    <p className="text-xs text-app-text-muted">Activa o desactiva módulos para este cliente</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/10 rounded-xl transition-all text-app-text-muted hover:text-white active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {!isAuthenticated ? (
                                /* Formulario de Clave Maestra */
                                <form onSubmit={handleVerifyKey} className="py-8 flex flex-col items-center text-center max-w-sm mx-auto space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                                        <Lock size={30} />
                                    </div>
                                    <h4 className="text-lg font-bold text-white">Introduce la Clave Maestra</h4>
                                    <p className="text-xs text-app-text-muted leading-relaxed">
                                        Ingresa tu clave de SuperAdmin para configurar los permisos y módulos de este cliente.
                                    </p>

                                    <div className="w-full relative mt-2">
                                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/60" />
                                        <input
                                            type="password"
                                            value={masterKey}
                                            onChange={(e) => setMasterKey(e.target.value)}
                                            placeholder="Clave maestra..."
                                            autoFocus
                                            className="w-full bg-[#131B2C] border border-app-border rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-gray-500"
                                        />
                                    </div>

                                    {authError && (
                                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl w-full">
                                            <AlertCircle size={14} />
                                            <span>{authError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isVerifying || !masterKey.trim()}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                                    >
                                        {isVerifying ? 'Verificando...' : 'Desbloquear Panel'}
                                    </button>
                                </form>
                            ) : (
                                /* Panel de Gestión de Módulos */
                                <div className="space-y-6">
                                    {/* Selector de Planes Rápidos */}
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
                                            <Sparkles size={14} /> Planes Predefinidos
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {(['STARTER', 'PRO', 'ENTERPRISE', 'CUSTOM'] as PlanType[]).map((plan) => {
                                                const isActive = selectedPlan === plan;
                                                const labels: Record<PlanType, { name: string; desc: string }> = {
                                                    STARTER: { name: 'Básico', desc: '6 módulos' },
                                                    PRO: { name: 'Pro', desc: '11 módulos' },
                                                    ENTERPRISE: { name: 'Full Enterprise', desc: 'Todos' },
                                                    CUSTOM: { name: 'Personalizado', desc: 'A medida' }
                                                };
                                                return (
                                                    <button
                                                        key={plan}
                                                        type="button"
                                                        onClick={() => handleSelectPlanPreset(plan)}
                                                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                                                            isActive
                                                                ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                                                : 'border-app-border/60 bg-[#131B2C]/60 text-app-text-muted hover:border-app-border hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                                                            <span>{labels[plan].name}</span>
                                                            {isActive && <Check size={14} className="text-cyan-400" />}
                                                        </div>
                                                        <div className="text-[10px] opacity-60 mt-0.5">{labels[plan].desc}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Lista Detallada de Módulos */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                                                <Layers size={14} /> Módulos Individuales ({selectedModules.length} de {ALL_MODULES.length})
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPlan('ENTERPRISE');
                                                        setSelectedModules(ALL_MODULES.map(m => m.id));
                                                    }}
                                                    className="text-[10px] text-cyan-400 hover:underline"
                                                >
                                                    Marcar todos
                                                </button>
                                                <span className="text-app-border">|</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPlan('STARTER');
                                                        setSelectedModules([...PLAN_PRESETS.STARTER]);
                                                    }}
                                                    className="text-[10px] text-app-text-muted hover:text-white"
                                                >
                                                    Mínimos
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto custom-scrollbar p-1">
                                            {ALL_MODULES.map((mod) => {
                                                const isEnabled = selectedModules.includes(mod.id);
                                                return (
                                                    <div
                                                        key={mod.id}
                                                        onClick={() => handleToggleModule(mod.id)}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                                            isEnabled
                                                                ? 'border-cyan-500/40 bg-cyan-950/20 text-white'
                                                                : 'border-app-border/40 bg-[#131B2C]/30 text-app-text-muted opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors ${
                                                            isEnabled ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-app-border bg-black/40'
                                                        }`}>
                                                            {isEnabled && <Check size={12} strokeWidth={3} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold truncate">{mod.label}</div>
                                                            <div className="text-[10px] text-app-text-muted line-clamp-1">{mod.description}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Mensajes de Feedback */}
                                    {statusMessage && (
                                        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                                            statusMessage.type === 'success'
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                                        }`}>
                                            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                            <span>{statusMessage.text}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {isAuthenticated && (
                            <div className="p-4 border-t border-app-border/40 bg-[#0a0f18] flex items-center justify-between">
                                <span className="text-[10px] text-app-text-muted">
                                    Configuración persistente en Base de Datos
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 rounded-xl border border-app-border hover:bg-white/5 text-xs text-app-text-muted transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                                    >
                                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                        {isSaving ? 'Guardando...' : 'Aplicar Cambios'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
