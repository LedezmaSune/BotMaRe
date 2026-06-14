import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Autoresponder } from '../../types';
import { Plus, Trash2, Edit2, Play, Square, Search, ToggleLeft, ToggleRight, Bot, MessageSquareOff, MessageCircle, Download, Upload, Zap, Database } from 'lucide-react';
import { useGlobalBotData } from '@/app/BotDataProvider';


interface AutorespondersPanelProps {
    autoresponders: Autoresponder[];
    onRefresh: () => void;
}

const AutoresponderNode = ({ rule, allRules, handleOpenForm, handleToggle, handleDelete, level }: any) => {
    const children = allRules.filter((r: any) => r.parentId === rule.id);
    
    return (
        <motion.div 
            layout
            variants={{
                hidden: { opacity: 0, x: -20 },
                show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
            }}
            className="flex flex-col relative"
        >
            <div className={`premium-glass p-6 rounded-2xl relative overflow-hidden transition-all duration-300 border ${rule.isActive ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-app-border opacity-70'}`}>
                {/* Status bar */}
                <div className={`absolute top-0 left-0 w-full h-1 ${rule.isActive ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-app-border'}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400">
                                {rule.matchType === 'exact' ? 'Exacto' : 'Contiene'}
                            </span>
                            <h3 className="text-xl font-bold font-mono text-emerald-400">"{rule.keyword}"</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleToggle(rule.id, rule.isActive)} className="text-app-text-muted hover:text-white transition-colors">
                            {rule.isActive ? <ToggleRight size={24} className="text-emerald-400" /> : <ToggleLeft size={24} />}
                        </button>
                    </div>
                </div>

                <div className="bg-app-bg/50 p-3 rounded-xl border border-app-border/50 mb-4 overflow-y-auto custom-scrollbar max-h-32">
                    <p className="text-sm whitespace-pre-wrap font-medium">{rule.response || '(Sin mensaje)'}</p>
                </div>

                <div className="flex items-center justify-between border-t border-app-border/50 pt-4 mt-auto">
                    <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-app-card border border-app-border/50">
                        {rule.aiAction === 'menu_only' && <><MessageCircle size={14} className="text-blue-400"/> Solo Menú</>}
                        {rule.aiAction === 'ai_context' && <><Bot size={14} className="text-purple-400"/> IA + Menú</>}
                        {rule.aiAction === 'no_response' && <><MessageSquareOff size={14} className="text-red-400"/> Ignorar</>}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => handleOpenForm(null, rule.id)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-lg transition-all border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                            <Plus size={14} /> Submenú
                        </button>
                        <button onClick={() => handleOpenForm(rule)} className="p-2 bg-app-card hover:bg-blue-500/20 text-app-text hover:text-blue-400 rounded-lg transition-all border border-app-border">
                            <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="p-2 bg-app-card hover:bg-red-500/20 text-app-text hover:text-red-400 rounded-lg transition-all border border-app-border">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {children.length > 0 && (
                <div className="ml-8 mt-4 pl-8 border-l-2 border-emerald-500/20 flex flex-col gap-4 relative">
                    {children.map((child: any) => (
                        <div key={child.id} className="relative">
                            <div className="absolute w-8 h-2 border-b-2 border-l-2 border-emerald-500/20 rounded-bl-lg -left-8 top-1/2 -translate-y-1/2"></div>
                            <AutoresponderNode 
                                rule={child} 
                                allRules={allRules} 
                                handleOpenForm={handleOpenForm}
                                handleToggle={handleToggle}
                                handleDelete={handleDelete}
                                level={level + 1}
                            />
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export function AutorespondersPanel({ autoresponders, onRefresh }: AutorespondersPanelProps) {
    const { settings } = useGlobalBotData();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Autoresponder | null>(null);
    const [isGlobalEnabled, setIsGlobalEnabled] = useState(settings?.AUTORESPONDERS_ENABLED !== 'false');
    const [isProcessing, setIsProcessing] = useState(false);

    const [formState, setFormState] = useState({
        keyword: '',
        matchType: 'exact' as 'exact' | 'contains',
        response: '',
        aiAction: 'menu_only' as 'menu_only' | 'ai_context' | 'no_response',
        isActive: true,
        parentId: null as number | null
    });

    const resetForm = (parentId: number | null = null) => {
        setFormState({
            keyword: '',
            matchType: 'exact',
            response: '',
            aiAction: 'menu_only',
            isActive: true,
            parentId: parentId
        });
        setEditingRule(null);
    };

    const handleOpenForm = (rule?: Autoresponder, parentId: number | null = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormState({
                keyword: rule.keyword,
                matchType: rule.matchType,
                response: rule.response,
                aiAction: rule.aiAction,
                isActive: Boolean(rule.isActive),
                parentId: rule.parentId || null
            });
        } else {
            resetForm(parentId);
        }
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingRule ? 'PATCH' : 'POST';
            const url = editingRule ? `/api/autoresponders/${editingRule.id}` : '/api/autoresponders';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState)
            });

            if (res.ok) {
                setIsFormOpen(false);
                resetForm();
                onRefresh();
            } else {
                alert('Error al guardar la regla.');
            }
        } catch (error) {
            console.error(error);
            alert('Error de red al guardar la regla.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta regla?')) return;
        try {
            const res = await fetch(`/api/autoresponders/${id}`, { method: 'DELETE' });
            if (res.ok) onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggle = async (id: number, currentStatus: number) => {
        try {
            const res = await fetch(`/api/autoresponders/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            if (res.ok) onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleGlobalToggle = async () => {
        const newValue = !isGlobalEnabled;
        setIsGlobalEnabled(newValue);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ AUTORESPONDERS_ENABLED: newValue ? 'true' : 'false' })
            });
        } catch (error) {
            console.error('Error toggling global autoresponders:', error);
        }
    };

    const handleGenerateExamples = async () => {
        if (!confirm('¿Generar ejemplos sobrescribirá tus reglas actuales con reglas de prueba. ¿Deseas continuar?')) return;
        setIsProcessing(true);
        try {
            // Eliminar todas las actuales
            for (const r of autoresponders) {
                await fetch(`/api/autoresponders/${r.id}`, { method: 'DELETE' });
            }
            
            const examples = [
                { keyword: 'MENU', matchType: 'exact', response: '¡Hola! Este es nuestro menú de opciones:\n1. Hablar con Soporte\n2. Ver Promociones\n3. Horarios\n\nResponde con el número de la opción.', aiAction: 'menu_only', isActive: true },
                { keyword: 'soporte', matchType: 'contains', response: 'Eres un experto en soporte técnico. El usuario seleccionó la opción soporte del menú. Atiéndelo amablemente y ayúdalo a resolver sus dudas.', aiAction: 'ai_context', isActive: true },
                { keyword: 'detener', matchType: 'exact', response: '', aiAction: 'no_response', isActive: true }
            ];

            for (const ex of examples) {
                await fetch('/api/autoresponders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ex)
                });
            }
            onRefresh();
            alert('✅ Ejemplos generados con éxito.');
        } catch (e) {
            alert('❌ Error al generar ejemplos.');
        }
        setIsProcessing(false);
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(autoresponders, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "autorespuestas_backup.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!Array.isArray(data)) throw new Error('Formato inválido');
                if (confirm(`¿Importar ${data.length} reglas?`)) {
                    setIsProcessing(true);
                    for (const r of data) {
                        await fetch('/api/autoresponders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                keyword: r.keyword,
                                matchType: r.matchType || 'exact',
                                response: r.response || '',
                                aiAction: r.aiAction || 'menu_only',
                                isActive: r.isActive !== undefined ? r.isActive : true
                            })
                        });
                    }
                    onRefresh();
                    alert('✅ Importación completada.');
                }
            } catch (err) {
                alert('❌ Error al importar archivo.');
            }
            setIsProcessing(false);
        };
        reader.readAsText(file);
        e.target.value = ''; // reset input
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="premium-glass p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-700"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h2 className="text-3xl font-black flex items-center gap-3">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                                    Menús y Auto-Respuestas
                                </span>
                            </h2>
                        </div>
                        <p className="text-app-text-muted text-sm max-w-xl mb-4">
                            Configura palabras clave para enviar menús fijos, dar instrucciones a la IA, o ignorar mensajes.
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                            <button onClick={handleGenerateExamples} disabled={isProcessing} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-[10px] font-black text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all uppercase tracking-widest disabled:opacity-50">
                                <Zap size={12} /> Ejemplos
                            </button>
                            <button onClick={handleExportJson} disabled={isProcessing} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-[10px] font-black text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all uppercase tracking-widest disabled:opacity-50">
                                <Download size={12} /> Respaldar
                            </button>
                            <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-[10px] font-black text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all uppercase tracking-widest cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Upload size={12} /> Importar
                                <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
                            </label>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleOpenForm()}
                        className="btn-primary"
                        disabled={isProcessing}
                    >
                        <Plus size={18} />
                        <span>Nueva Regla</span>
                    </button>
                </div>
            </div>

            {/* Global Disabled Banner */}
            {!isGlobalEnabled && (
                <motion.div 
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    className="premium-glass p-6 rounded-3xl relative overflow-hidden border border-red-500/30 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
                                <MessageSquareOff size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-400 mb-1">El Sistema de Auto-Respuestas está APAGADO</h3>
                                <p className="text-app-text-muted text-sm max-w-2xl">
                                    Las reglas configuradas abajo no funcionarán hasta que actives nuevamente la opción global desde aquí o desde el Control Maestro (Ajustes).
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleGlobalToggle}
                            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-xl font-black transition-all hover:scale-105"
                        >
                            ENCENDER SISTEMA
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Flow Builder / Tree View */}
            <motion.div 
                className={`flex flex-col gap-6 transition-all duration-500 pb-20 ${!isGlobalEnabled ? 'opacity-40 grayscale-[50%] pointer-events-none' : ''}`}
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.05 }
                    }
                }}
            >
                {autoresponders.length === 0 && (
                    <motion.div 
                        variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
                        className="premium-glass p-12 rounded-3xl flex flex-col items-center justify-center text-center"
                    >
                        <div className="w-20 h-20 bg-app-card rounded-full flex items-center justify-center mb-4 border border-app-border">
                            <MessageCircle className="text-app-text-muted" size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No hay reglas configuradas</h3>
                        <p className="text-app-text-muted max-w-sm mb-6">
                            Crea tu primer flujo de respuestas rápidas o menús interactivos.
                        </p>
                        <button onClick={() => handleOpenForm()} className="btn-primary">
                            <Plus size={18} /> Crear Primera Regla
                        </button>
                    </motion.div>
                )}

                <AnimatePresence mode="popLayout">
                    {/* Render Root Nodes */}
                    {autoresponders.filter(r => !r.parentId).map((rootRule) => (
                        <AutoresponderNode 
                            key={rootRule.id} 
                            rule={rootRule} 
                            allRules={autoresponders} 
                            handleOpenForm={handleOpenForm}
                            handleToggle={handleToggle}
                            handleDelete={handleDelete}
                            level={0}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
                    <div className="premium-glass w-full max-w-2xl rounded-3xl p-8 relative z-10 border border-app-border/50 animate-scale-in">
                        <h3 className="text-2xl font-black mb-6">{editingRule ? 'Editar Regla' : 'Nueva Regla'}</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-app-text-muted">Palabra Clave</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formState.keyword}
                                        onChange={(e) => setFormState({...formState, keyword: e.target.value})}
                                        className="input-field font-mono text-cyan-400"
                                        placeholder="Ej: MENU, cancelar, ayuda"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-app-text-muted">Tipo de Coincidencia</label>
                                    <select 
                                        value={formState.matchType}
                                        onChange={(e) => setFormState({...formState, matchType: e.target.value as any})}
                                        className="input-field"
                                    >
                                        <option value="exact">Exacta (Debe ser idéntica)</option>
                                        <option value="contains">Contiene (Si la palabra está en la frase)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-app-text-muted">Acción de la IA</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setFormState({...formState, aiAction: 'menu_only'})}
                                        className={`p-4 rounded-xl border text-left transition-all ${formState.aiAction === 'menu_only' ? 'border-blue-500 bg-blue-500/10' : 'border-app-border bg-app-card hover:bg-app-card/80'}`}
                                    >
                                        <MessageCircle className={`mb-2 ${formState.aiAction === 'menu_only' ? 'text-blue-400' : 'text-app-text-muted'}`} />
                                        <div className="font-bold text-sm">Solo Menú</div>
                                        <div className="text-[10px] text-app-text-muted mt-1 leading-tight">Envía el mensaje fijo. La IA no interviene.</div>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setFormState({...formState, aiAction: 'ai_context'})}
                                        className={`p-4 rounded-xl border text-left transition-all ${formState.aiAction === 'ai_context' ? 'border-purple-500 bg-purple-500/10' : 'border-app-border bg-app-card hover:bg-app-card/80'}`}
                                    >
                                        <Bot className={`mb-2 ${formState.aiAction === 'ai_context' ? 'text-purple-400' : 'text-app-text-muted'}`} />
                                        <div className="font-bold text-sm">IA + Menú</div>
                                        <div className="text-[10px] text-app-text-muted mt-1 leading-tight">La IA formula la respuesta basándose en tu menú.</div>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setFormState({...formState, aiAction: 'no_response'})}
                                        className={`p-4 rounded-xl border text-left transition-all ${formState.aiAction === 'no_response' ? 'border-red-500 bg-red-500/10' : 'border-app-border bg-app-card hover:bg-app-card/80'}`}
                                    >
                                        <MessageSquareOff className={`mb-2 ${formState.aiAction === 'no_response' ? 'text-red-400' : 'text-app-text-muted'}`} />
                                        <div className="font-bold text-sm">No Responder</div>
                                        <div className="text-[10px] text-app-text-muted mt-1 leading-tight">Ignora el mensaje por completo.</div>
                                    </button>
                                </div>
                            </div>

                            {formState.aiAction !== 'no_response' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-app-text-muted">
                                        {formState.aiAction === 'menu_only' ? 'Mensaje a Enviar' : 'Instrucción o Menú para la IA'}
                                    </label>
                                    <textarea 
                                        required
                                        rows={6}
                                        value={formState.response}
                                        onChange={(e) => setFormState({...formState, response: e.target.value})}
                                        className="input-field resize-none"
                                        placeholder="Escribe las opciones del menú o la respuesta..."
                                    />
                                    <div className="text-[10px] text-app-text-muted mt-1">
                                        Variables soportadas: <code className="text-cyan-400">{' {NOMBRE}'}</code>, <code className="text-cyan-400">{' {FECHA}'}</code>, <code className="text-cyan-400">{' {HORA_12}'}</code>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    Guardar Regla
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
