"use client";

import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Plus, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AccessMode = 'all' | 'whitelist' | 'blacklist' | 'none';

interface AccessList {
    mode: AccessMode;
    whitelist: string[];
    blacklist: string[];
}

interface AccessConfig {
    contacts: AccessList;
    groups: AccessList;
}

export default function AccessControlUI() {
    const [config, setConfig] = useState<AccessConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'contactos' | 'grupos'>('contactos');
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/access');
            const data = await res.json();
            if (res.ok) {
                setConfig(data);
            }
        } catch (err) {
            console.error("Error fetching access config", err);
        } finally {
            setLoading(false);
        }
    };

    const sendCommand = async (action: string, value: string) => {
        try {
            const res = await fetch('/api/access/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: activeTab,
                    action,
                    value
                })
            });
            const data = await res.json();
            if (res.ok) {
                setConfig(data.config);
                setInputValue('');
                setError('');
            } else {
                setError(data.error || 'Error ejecutando acción');
            }
        } catch (err) {
            setError("Error de red");
        }
    };

    const handleAdd = (type: 'whitelist' | 'blacklist') => {
        if (!inputValue.trim()) return;
        const action = type === 'whitelist' ? 'add' : 'ban';
        sendCommand(action, inputValue.trim());
    };

    const handleRemove = (id: string) => {
        sendCommand('remove', id);
    };

    const handleModeChange = (mode: AccessMode) => {
        sendCommand('mode', mode);
    };

    if (loading) return <div className="text-white">Cargando listas de acceso...</div>;
    if (!config) return <div className="text-red-400">Error cargando configuración.</div>;

    const currentList = activeTab === 'contactos' ? config.contacts : config.groups;

    const getModeDescription = (mode: AccessMode, isGroup: boolean) => {
        const target = isGroup ? "los grupos" : "los contactos";
        switch (mode) {
            case 'all': return `El bot responde a todos ${target}.`;
            case 'whitelist': return `El bot SOLO responde a ${target} en la Lista Blanca.`;
            case 'blacklist': return `El bot responde a todos EXCEPTO a ${target} en la Lista Negra.`;
            case 'none': return `El bot ignora a todos ${target}.`;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700">
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-800/80">
                <button
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'contactos' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                    onClick={() => setActiveTab('contactos')}
                >
                    👤 Contactos
                </button>
                <button
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'grupos' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                    onClick={() => setActiveTab('grupos')}
                >
                    👥 Grupos
                </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto">
                {/* Modo Section */}
                <section>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        Modo de Respuesta
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(['all', 'whitelist', 'blacklist', 'none'] as AccessMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleModeChange(mode)}
                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                                    currentList.mode === mode 
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-700'
                                }`}
                            >
                                {mode.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-slate-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {getModeDescription(currentList.mode, activeTab === 'grupos')}
                    </p>
                </section>

                {/* Input Add Section */}
                <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Agregar nuevo número / ID
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={activeTab === 'contactos' ? "Ej. 5215512345678" : "Ej. 123456-789@g.us"}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={() => handleAdd('whitelist')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Blanca
                        </button>
                        <button
                            onClick={() => handleAdd('blacklist')}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
                        >
                            <ShieldAlert className="w-4 h-4" /> Negra
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </section>

                {/* Lists Display */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Whitelist */}
                    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                        <h4 className="text-emerald-400 font-semibold mb-4 flex items-center justify-between">
                            Lista Blanca
                            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full">{currentList.whitelist.length}</span>
                        </h4>
                        <div className="space-y-2">
                            {currentList.whitelist.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-4">Lista vacía</p>
                            ) : (
                                currentList.whitelist.map((id: string) => (
                                    <div key={id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300 group">
                                        <span>{id}</span>
                                        <button onClick={() => handleRemove(id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Blacklist */}
                    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                        <h4 className="text-red-400 font-semibold mb-4 flex items-center justify-between">
                            Lista Negra
                            <span className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">{currentList.blacklist.length}</span>
                        </h4>
                        <div className="space-y-2">
                            {currentList.blacklist.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-4">Lista vacía</p>
                            ) : (
                                currentList.blacklist.map((id: string) => (
                                    <div key={id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300 group">
                                        <span>{id}</span>
                                        <button onClick={() => handleRemove(id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
