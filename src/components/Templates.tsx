'use client';

import { useState } from 'react';
import { Layout, Plus, Trash2, Save, FileText, X, Wand2, Loader2, Edit2, Upload, Download } from 'lucide-react';
import { Template } from '../types';
import { VariableTextarea } from './VariableTextarea';

interface TemplatesProps {
    templates: Template[];
    onRefresh: () => void;
    onReview: (text: string) => Promise<string | null>;
}

export function Templates({ templates, onRefresh, onReview }: TemplatesProps) {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);

    const handleReview = async () => {
        if (!content) return;
        setReviewing(true);
        const corrected = await onReview(content);
        if (corrected) setContent(corrected);
        setReviewing(false);
    };

    const handleEdit = (t: Template) => {
        setEditingId(t.id);
        setName(t.name);
        setContent(t.content);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = editingId ? `/api/templates/${editingId}` : '/api/templates';
            const method = editingId ? 'PUT' : 'POST';
            
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content })
            });
            setName('');
            setContent('');
            setEditingId(null);
            setShowForm(false);
            onRefresh();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que deseas eliminar esta plantilla?')) return;
        await fetch(`/api/templates/${id}`, { method: 'DELETE' });
        onRefresh();
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Layout size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-app-text tracking-tight">Plantillas</h2>
                        <p className="text-app-text-muted text-xs uppercase tracking-widest font-bold">Mensajes predefinidos para difusión y recordatorios</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `plantillas_botmare_${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                        }}
                        className="p-3 bg-app-card border border-app-border rounded-2xl text-app-text-muted hover:text-indigo-500 hover:border-indigo-500/50 transition-all shadow-sm"
                        title="Exportar todas las plantillas"
                    >
                        <Save size={20} />
                    </button>

                    <label className="p-3 bg-app-card border border-app-border rounded-2xl text-app-text-muted hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-sm cursor-pointer" title="Importar plantillas desde JSON">
                        <Upload size={20} />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".json" 
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                    try {
                                        const data = JSON.parse(ev.target?.result as string);
                                        const templatesToImport = Array.isArray(data) ? data : (data.templates || []);
                                        
                                        if (confirm(`¿Deseas importar ${templatesToImport.length} plantillas?`)) {
                                            for (const t of templatesToImport) {
                                                await fetch('/api/templates', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ name: t.name, content: t.content })
                                                });
                                            }
                                            onRefresh();
                                            alert('✅ Plantillas importadas con éxito.');
                                        }
                                    } catch (err) {
                                        alert('❌ Error al leer el archivo de plantillas.');
                                    }
                                };
                                reader.readAsText(file);
                            }}
                        />
                    </label>

                    <button
                        onClick={() => {
                            if (showForm) {
                                setShowForm(false);
                                setEditingId(null);
                                setName('');
                                setContent('');
                            } else {
                                setShowForm(true);
                            }
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${showForm ? 'bg-slate-200 dark:bg-slate-800 text-app-text' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20'}`}
                    >
                        {showForm ? <X size={20} /> : <Plus size={20} />}
                        {showForm ? 'Cerrar' : 'Nueva Plantilla'}
                    </button>
                </div>
            </div>

            {showForm && (
                <section className="relative z-50 bg-app-card border border-app-border rounded-3xl p-6 mb-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-black text-app-text-muted mb-1 block tracking-widest">Nombre de la Plantilla</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-app-text"
                                placeholder="Ej: Bienvenida Cliente Nuevo"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-black text-app-text-muted tracking-widest">Contenido del Mensaje</label>
                                <button
                                    type="button"
                                    onClick={handleReview}
                                    disabled={reviewing || !content}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-indigo-500/30 rounded-lg text-[9px] font-black text-indigo-500 hover:bg-indigo-500/10 hover:border-indigo-500/60 transition-all uppercase tracking-widest disabled:opacity-30 group"
                                >
                                    {reviewing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} className="group-hover:rotate-12 transition-transform" />}
                                    {reviewing ? 'Revisando...' : 'Perfeccionar con IA'}
                                </button>
                            </div>
                            <VariableTextarea
                                value={content}
                                onChange={(val) => setContent(val)}
                                className="w-full h-64 bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none transition-all text-app-text custom-scrollbar shadow-inner"
                                placeholder="Escribe el contenido de tu plantilla aquí... Usa {NOMBRE} para personalizar."
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {editingId ? <Edit2 size={20} /> : <Save size={20} />}
                            {loading ? 'Guardando...' : editingId ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
                        </button>
                    </form>
                </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(t => (
                    <div key={t.id} className="bg-app-card border border-app-border rounded-2xl p-5 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-indigo-500" />
                                <h3 className="font-bold text-app-text uppercase text-xs tracking-wider">{t.name}</h3>
                            </div>
                             <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleEdit(t)}
                                    className="text-app-text-muted hover:text-indigo-500 transition-colors p-1"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="text-red-500/40 hover:text-red-500 transition-colors p-1"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-app-text-muted line-clamp-3 leading-relaxed whitespace-pre-wrap italic bg-app-bg dark:bg-background/40 p-3 rounded-xl border border-app-border/10 group-hover:border-indigo-500/10">
                            {t.content}
                        </p>
                    </div>
                ))}

                {templates.length === 0 && !showForm && (
                    <div className="md:col-span-2 py-20 text-center bg-app-bg dark:bg-background/20 rounded-3xl border-2 border-dashed border-app-border">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-app-text-muted">
                            <FileText size={32} />
                        </div>
                        <p className="text-app-text-muted font-bold uppercase text-xs tracking-widest">No hay plantillas guardadas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
