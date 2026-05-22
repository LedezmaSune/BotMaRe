import React, { useState } from 'react';
import { Autoresponder } from '../../types';
import { Plus, Trash2, Edit2, Play, Square, Search, ToggleLeft, ToggleRight, Bot, MessageSquareOff, MessageCircle } from 'lucide-react';

interface AutorespondersPanelProps {
    autoresponders: Autoresponder[];
    onRefresh: () => void;
}

export function AutorespondersPanel({ autoresponders, onRefresh }: AutorespondersPanelProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Autoresponder | null>(null);

    const [formState, setFormState] = useState({
        keyword: '',
        matchType: 'exact' as 'exact' | 'contains',
        response: '',
        aiAction: 'menu_only' as 'menu_only' | 'ai_context' | 'no_response',
        isActive: true
    });

    const resetForm = () => {
        setFormState({
            keyword: '',
            matchType: 'exact',
            response: '',
            aiAction: 'menu_only',
            isActive: true
        });
        setEditingRule(null);
    };

    const handleOpenForm = (rule?: Autoresponder) => {
        if (rule) {
            setEditingRule(rule);
            setFormState({
                keyword: rule.keyword,
                matchType: rule.matchType,
                response: rule.response,
                aiAction: rule.aiAction,
                isActive: Boolean(rule.isActive)
            });
        } else {
            resetForm();
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

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="premium-glass p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-700"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                                Menús y Auto-Respuestas
                            </span>
                        </h2>
                        <p className="text-app-text-muted text-sm max-w-xl">
                            Configura palabras clave para enviar menús fijos, dar instrucciones a la IA, o ignorar mensajes.
                        </p>
                    </div>

                    <button 
                        onClick={() => handleOpenForm()}
                        className="btn-primary"
                    >
                        <Plus size={18} />
                        <span>Nueva Regla</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {autoresponders.length === 0 && (
                    <div className="col-span-full premium-glass p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-app-card rounded-full flex items-center justify-center mb-4 border border-app-border">
                            <MessageCircle className="text-app-text-muted" size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No hay reglas configuradas</h3>
                        <p className="text-app-text-muted max-w-sm mb-6">
                            Crea tu primera regla para empezar a automatizar respuestas rápidas o menús interactivos.
                        </p>
                        <button onClick={() => handleOpenForm()} className="btn-primary">
                            <Plus size={18} /> Crear Primera Regla
                        </button>
                    </div>
                )}

                {autoresponders.map((rule) => (
                    <div key={rule.id} className={`premium-glass p-6 rounded-2xl relative overflow-hidden transition-all duration-300 border ${rule.isActive ? 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-app-border opacity-70'}`}>
                        {/* Status bar */}
                        <div className={`absolute top-0 left-0 w-full h-1 ${rule.isActive ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-app-border'}`}></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold font-mono text-cyan-400">"{rule.keyword}"</h3>
                                <span className="text-xs uppercase tracking-widest text-app-text-muted mt-1 inline-block bg-app-card px-2 py-1 rounded-md border border-app-border/50">
                                    {rule.matchType === 'exact' ? 'Coincidencia Exacta' : 'Contiene Palabra'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleToggle(rule.id, rule.isActive)} className="text-app-text-muted hover:text-white transition-colors">
                                    {rule.isActive ? <ToggleRight size={24} className="text-cyan-400" /> : <ToggleLeft size={24} />}
                                </button>
                            </div>
                        </div>

                        <div className="bg-app-bg/50 p-3 rounded-xl border border-app-border/50 mb-4 h-24 overflow-y-auto custom-scrollbar">
                            <p className="text-sm whitespace-pre-wrap font-medium">{rule.response || '(Sin mensaje)'}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-app-border/50 pt-4 mt-auto">
                            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-app-card border border-app-border/50">
                                {rule.aiAction === 'menu_only' && <><MessageCircle size={14} className="text-blue-400"/> Solo Menú</>}
                                {rule.aiAction === 'ai_context' && <><Bot size={14} className="text-purple-400"/> IA + Menú</>}
                                {rule.aiAction === 'no_response' && <><MessageSquareOff size={14} className="text-red-400"/> Ignorar</>}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleOpenForm(rule)} className="p-2 bg-app-card hover:bg-blue-500/20 text-app-text hover:text-blue-400 rounded-lg transition-all border border-app-border">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(rule.id)} className="p-2 bg-app-card hover:bg-red-500/20 text-app-text hover:text-red-400 rounded-lg transition-all border border-app-border">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
