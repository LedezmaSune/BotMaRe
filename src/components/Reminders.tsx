'use client';

import { useState, useEffect } from 'react';
import { Bell, Loader2, Send, Clock, Trash2, CheckCircle, Edit3, Zap, Save, Wand2, Sparkles, Upload, Download, Info } from 'lucide-react';
import { Reminder, Template } from '../types';
import { VariableTextarea } from './VariableTextarea';

interface RemindersProps {
    reminders: Reminder[];
    templates: Template[];
    onAdd: (chatId: string, text: string, time: string, media: File | null, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    initialTime?: string;
}

export function Reminders({ reminders, templates, onAdd, onDelete, initialTime }: RemindersProps) {
    const [chatId, setChatId] = useState('');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [time, setTime] = useState(initialTime || '');

    useEffect(() => {
        if (initialTime) setTime(initialTime);
    }, [initialTime]);

    const [media, setMedia] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [repeat, setRepeat] = useState('none');
    const [repeatInterval, setRepeatInterval] = useState(1);
    const [repeatUnit, setRepeatUnit] = useState('days');

    const [showAdvancedModal, setShowAdvancedModal] = useState(false);
    const [advInterval, setAdvInterval] = useState(1);
    const [advUnit, setAdvUnit] = useState('days');
    const [advSkipWeekends, setAdvSkipWeekends] = useState(false);
    const [advDays, setAdvDays] = useState<number[]>([]);
    const [advMonthlyType, setAdvMonthlyType] = useState('day');

    const selectedDate = time ? new Date(time) : new Date();
    const dayOfWeekName = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayOfMonth = selectedDate.getDate();
    const dayAndMonth = selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [groupLoading, setGroupLoading] = useState(false);

    const fetchGroups = async () => {
        setGroupLoading(true);
        try {
            const res = await fetch('/api/whatsapp/groups');
            const data = await res.json();
            setGroups(data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setGroupLoading(false);
        }
    };

    const handleSelectGroup = (g: any) => {
        setChatId(g.id);
        setShowGroupModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (editingId) {
            // Update logic
            await fetch(`/api/reminders/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, text, time, repeat, repeatInterval, repeatUnit, title })
            });
            setEditingId(null);
        } else {
            await onAdd(chatId, text, time, media, repeat, repeatInterval, repeatUnit, title);
        }
        setChatId('');
        setTitle('');
        setText('');
        setTime('');
        setMedia(null);
        setRepeat('none');
        setRepeatInterval(1);
        setRepeatUnit('days');
        setLoading(false);
    };

    const handleEdit = (r: Reminder) => {
        setEditingId(r.id);
        setChatId(r.chatId);
        setTitle(r.title || '');
        setText(r.text);
        // Date format handling for datetime-local
        setTime(r.time); 
        setRepeat(r.repeat || 'none');
        setRepeatInterval(r.repeatInterval || 1);
        setRepeatUnit(r.repeatUnit || 'days');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSendNow = async (id: number) => {
        if (!confirm('¿Enviar este mensaje ahora mismo?')) return;
        setLoading(true);
        try {
            await fetch(`/api/reminders/${id}/send-now`, { method: 'POST' });
            // Refresh logic usually handled by parent polling but we can force it if needed
        } finally {
            setLoading(false);
        }
    };
    const handleAIPerfect = async () => {
        if (!text) return;
        setLoading(true);
        try {
            const res = await fetch('/api/ai/perfect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await res.json();
            if (data.perfected) setText(data.perfected);
        } catch (error) {
            console.error('Error perfecting message:', error);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Form */}
            <section className="lg:col-span-1 bg-app-card border border-app-border rounded-3xl p-5 md:p-6 backdrop-blur-xl animate-in fade-in slide-in-from-left-4 duration-500 shadow-2xl h-fit transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        {editingId ? <Edit3 size={20} className="md:w-6 md:h-6" /> : <Bell size={20} className="md:w-6 md:h-6" />}
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-app-text leading-tight">{editingId ? 'Editar' : 'Programar'}</h2>
                        <p className="text-app-text-muted text-[10px] md:text-xs">{editingId ? 'Modifica el recordatorio.' : 'Recordatorios automáticos.'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(reminders, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `agenda_botmare_${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 border border-app-border rounded-xl text-[10px] font-black uppercase text-app-text-muted hover:text-cyan-500 hover:border-cyan-500/50 transition-all"
                        title="Exportar agenda"
                    >
                        <Save size={14} />
                        Exportar
                    </button>

                    <label className="flex-1 flex-row flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 border border-app-border rounded-xl text-[10px] font-black uppercase text-app-text-muted hover:text-emerald-500 hover:border-emerald-500/50 transition-all cursor-pointer" title="Importar agenda">
                        <Upload size={14} />
                        Importar
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
                                        const toImport = Array.isArray(data) ? data : (data.reminders || []);
                                        
                                        if (confirm(`¿Deseas importar ${toImport.length} recordatorios a la agenda?`)) {
                                            for (const r of toImport) {
                                                await onAdd(r.chatId, r.text, r.time, null, r.repeat, r.repeatInterval, r.repeatUnit, r.title);
                                            }
                                            alert('✅ Agenda importada con éxito.');
                                        }
                                    } catch (err) {
                                        alert('❌ Error al leer el archivo de agenda.');
                                    }
                                };
                                reader.readAsText(file);
                            }}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => alert(`📌 GUÍA CARGA MASIVA JSON\n\nEl archivo debe ser un .json con esta estructura:\n[\n  {\n    "title": "Nombre opcional",\n    "chatId": "521XXXXXXXXXX",\n    "text": "Tu mensaje aquí",\n    "time": "2024-12-31T23:59",\n    "repeat": "none"\n  }\n]\n\nCampos: chatId (número o grupo), time (YYYY-MM-DDTHH:MM), repeat (none/daily/weekly).`)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 border border-app-border rounded-xl text-app-text-muted hover:text-amber-500 transition-all"
                        title="Ver ayuda de formato"
                    >
                        <Info size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Nombre del Recordatorio (Opcional)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-app-text"
                                placeholder="Ej: Cumpleaños de Juan..."
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Destinatarios / Grupos</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowGroupModal(true);
                                            fetchGroups();
                                        }}
                                        className="text-[9px] font-black text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 uppercase tracking-tighter hover:bg-violet-500/20 transition-all"
                                    >
                                        Buscar Grupos
                                    </button>
                                    <span className="text-[9px] font-black text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-tighter">
                                        {chatId.split('\n').filter(x => x.trim()).length} contactos
                                    </span>
                                </div>
                            </div>
                            <textarea
                                value={chatId}
                                onChange={(e) => setChatId(e.target.value)}
                                className="w-full h-24 bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none transition-all text-app-text custom-scrollbar"
                                placeholder="8181234567, Nombre&#10;521234567890, Cliente&#10;..."
                                required
                            />
                            <p className="text-[9px] text-app-text-muted mt-1 leading-tight px-1 italic">
                                Pon un contacto por línea o usa el botón <span className="text-violet-500 font-bold">Buscar Grupos</span>.
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Mensaje</label>
                                <button
                                    type="button"
                                    onClick={handleAIPerfect}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 rounded-lg text-[9px] font-black text-cyan-500 hover:bg-cyan-500/10 hover:border-cyan-500/60 transition-all uppercase tracking-widest group"
                                >
                                    <Wand2 size={12} className="group-hover:rotate-12 transition-transform" />
                                    Perfeccionar con IA
                                </button>
                            </div>

                            {templates.length > 0 && (
                                <div className="mb-2">
                                    <select
                                        onChange={(e) => {
                                            const t = templates.find(temp => temp.id === Number(e.target.value));
                                            if (t) setText(t.content);
                                            e.target.value = "";
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-800/50 border border-app-border rounded-xl px-3 py-2 text-[10px] font-bold text-app-text-muted outline-none transition-all uppercase tracking-widest cursor-pointer hover:border-cyan-500/30"
                                    >
                                        <option value="">-- Seleccionar Plantilla --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <VariableTextarea
                                value={text}
                                onChange={(val) => setText(val)}
                                className="w-full h-44 bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none transition-all text-app-text shadow-inner"
                                placeholder="Escribe tu mensaje..."
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Fecha y Hora (CDMX)</label>
                            <input
                                type="datetime-local"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-app-text"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Repetición</label>
                            <select
                                value={repeat}
                                onChange={(e) => {
                                    if (e.target.value === 'advanced') {
                                        setAdvInterval(repeatInterval);
                                        setAdvUnit(repeatUnit);
                                        setShowAdvancedModal(true);
                                    } else {
                                        setRepeat(e.target.value);
                                    }
                                }}
                                className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-app-text"
                            >
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="none">No se repite</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="hourly">Cada hora</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="daily">Diariamente</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="weekdays">Entre semana (lun-vie)</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="weekly">Semanalmente ({dayOfWeekName})</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="monthly">Mensual (Día {dayOfMonth})</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="yearly">Anual ({dayAndMonth})</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="advanced">Repetición avanzada...</option>
                            </select>
                        </div>
                        {/* Removing old inline advanced options */}
                        {!editingId && (
                            <div>
                                <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Multimedia (Opcional)</label>
                                <input
                                    type="file"
                                    onChange={(e) => setMedia(e.target.files?.[0] || null)}
                                    className="block w-full text-xs text-app-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-300 dark:hover:file:bg-slate-700 transition-all cursor-pointer"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {editingId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingId(null);
                                    setChatId('');
                                    setTitle('');
                                    setText('');
                                    setTime('');
                                }}
                                className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-app-text-muted dark:text-slate-200 rounded-2xl font-bold transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-[2] py-4 ${editingId ? 'bg-purple-600 hover:bg-purple-500' : 'bg-cyan-600 hover:bg-cyan-500'} text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (editingId ? <Save size={20} /> : <Send size={20} />)}
                            {loading ? (editingId ? 'Guardando...' : 'Programando...') : (editingId ? 'Guardar Cambios' : 'Fijar Recordatorio')}
                        </button>
                    </div>
                </form>
            </section>

            {/* List */}
            <section className="lg:col-span-2 space-y-8">
                {/* Pending List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-app-text-muted pl-2">Pendientes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reminders.filter(r => r.status !== 'sent').map((r) => (
                            <div 
                                key={r.id} 
                                className={`group relative bg-app-card border ${
                                    r.status === 'failed' ? 'border-red-500/20' : 
                                    r.status === 'processing' ? 'border-cyan-500/30' : 'border-app-border'
                                } rounded-3xl p-6 backdrop-blur-md transition-all hover:translate-y-[-2px] shadow-xl overflow-hidden`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                        r.status === 'failed' ? 'bg-red-500/10 text-red-400' : 
                                        r.status === 'processing' ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' : 'bg-background/80 text-app-text/50'
                                    }`}>
                                        {r.status}
                                    </span>
                                    <div className="flex items-center gap-2 text-app-text/40">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-bold tabular-nums">{r.time}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-app-text/80 line-clamp-2 mb-4 leading-relaxed">{r.text}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-app-border">
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleEdit(r)}
                                            className="text-app-text-muted hover:text-cyan-600 dark:hover:text-cyan-400 p-2 rounded-lg transition-all hover:bg-cyan-500/10"
                                            title="Editar"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleSendNow(r.id)}
                                            className="text-app-text-muted hover:text-amber-600 dark:hover:text-amber-400 p-2 rounded-lg transition-all hover:bg-amber-500/10"
                                            title="Enviar ahora"
                                        >
                                            <Zap size={16} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => onDelete(r.id)}
                                        className="text-red-500/70 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sent List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center pl-2">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/70">Enviados</h3>
                        <button 
                            onClick={() => {
                                if(confirm('¿Borrar todos los mensajes enviados?')) {
                                    reminders.filter(r => r.status === 'sent').forEach(r => onDelete(r.id));
                                }
                            }}
                            className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase tracking-tighter transition-all"
                        >
                            Limpiar Historial
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reminders.filter(r => r.status === 'sent').map((r) => (
                            <div 
                                key={r.id} 
                                className="group relative bg-emerald-500/[0.03] border border-emerald-500/10 rounded-3xl p-6 backdrop-blur-md transition-all shadow-lg overflow-hidden animate-in fade-in zoom-in duration-500"
                            >
                                <div className="absolute -right-4 -top-4 text-emerald-500/10 transition-all group-hover:scale-110 group-hover:text-emerald-500/20">
                                    <CheckCircle size={80} />
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                                        Entregado
                                    </span>
                                    <div className="flex items-center gap-2 text-app-text-muted">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-bold tabular-nums">{r.time}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-app-text-muted/80 line-clamp-3 mb-4 leading-relaxed relative z-10 line-through decoration-slate-400/50">{r.text}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-app-border relative z-10">
                                    <div className="text-[10px] text-app-text-muted font-bold tracking-tight truncate max-w-[150px]">
                                        A: {r.chatId}
                                    </div>
                                    <button 
                                        onClick={() => onDelete(r.id)}
                                        className="text-red-500/60 hover:text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-all bg-slate-200/50 dark:bg-slate-900/50"
                                        title="Borrar del historial"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {reminders.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-200/20 dark:bg-slate-900/20 border border-app-border border-dashed rounded-3xl flex flex-col items-center justify-center text-app-text-muted">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Bandeja de salida vacía.</p>
                    </div>
                )}
            </section>

            {showAdvancedModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-[#2D2D35] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                        <h3 className="text-white font-bold text-lg mb-6">Repetición avanzada</h3>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-white text-sm">Cada</span>
                            <input 
                                type="number" 
                                min="1"
                                value={advInterval} 
                                onChange={e => setAdvInterval(Number(e.target.value))}
                                className="w-16 bg-[#3B3B46] text-white rounded-xl py-3 text-center text-sm outline-none border border-transparent focus:border-cyan-500 transition-colors"
                            />
                            <select 
                                value={advUnit}
                                onChange={e => setAdvUnit(e.target.value)}
                                className="flex-1 bg-[#3B3B46] text-white rounded-xl py-3 px-3 text-sm outline-none border border-transparent focus:border-cyan-500 transition-colors cursor-pointer appearance-none"
                            >
                                <option value="minutes">minuto</option>
                                <option value="hours">hora</option>
                                <option value="days">día</option>
                                <option value="weeks">semana</option>
                                <option value="months">mes</option>
                            </select>
                        </div>

                        {advUnit === 'days' && (
                            <label className="flex items-center gap-3 mb-6 cursor-pointer">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${advSkipWeekends ? 'border-[#F3EBB9] bg-[#F3EBB9]' : 'border-gray-400'}`}>
                                    {advSkipWeekends && <CheckCircle size={14} className="text-black" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={advSkipWeekends}
                                    onChange={e => setAdvSkipWeekends(e.target.checked)}
                                />
                                <span className="text-white text-sm select-none">Saltar los fines de semana</span>
                            </label>
                        )}

                        {advUnit === 'weeks' && (
                            <div className="flex justify-between items-center mb-6">
                                {['d', 'l', 'm', 'm', 'j', 'v', 's'].map((d, i) => (
                                    <button 
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            setAdvDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
                                        }}
                                        className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center transition-all ${advDays.includes(i) ? 'bg-[#F3EBB9] text-black shadow-lg shadow-[#F3EBB9]/20' : 'bg-transparent text-white hover:bg-[#3B3B46]'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        )}

                        {advUnit === 'months' && (
                            <div className="space-y-4 mb-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${advMonthlyType === 'day' ? 'border-[#F3EBB9]' : 'border-gray-400'}`}>
                                        {advMonthlyType === 'day' && <div className="w-2.5 h-2.5 bg-[#F3EBB9] rounded-full" />}
                                    </div>
                                    <input type="radio" className="hidden" checked={advMonthlyType === 'day'} onChange={() => setAdvMonthlyType('day')} />
                                    <div className="flex-1 bg-[#3B3B46] text-white rounded-xl py-3 px-4 text-sm transition-colors">
                                        Día {dayOfMonth}
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${advMonthlyType === 'nth' ? 'border-[#F3EBB9]' : 'border-gray-400'}`}>
                                        {advMonthlyType === 'nth' && <div className="w-2.5 h-2.5 bg-[#F3EBB9] rounded-full" />}
                                    </div>
                                    <input type="radio" className="hidden" checked={advMonthlyType === 'nth'} onChange={() => setAdvMonthlyType('nth')} />
                                    <div className="flex-1 bg-[#3B3B46] text-white rounded-xl py-3 px-4 text-sm transition-colors">
                                        the 4th {dayOfWeekName}
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="space-y-2 mb-8">
                            <input
                                type="date"
                                value={time ? time.split('T')[0] : ''}
                                onChange={e => {
                                    const newDate = e.target.value;
                                    const currTime = time ? time.split('T')[1] : '00:00';
                                    if (newDate) setTime(`${newDate}T${currTime}`);
                                }}
                                className="w-full bg-[#3B3B46] text-white rounded-xl py-3 px-4 text-sm outline-none focus:border focus:border-cyan-500 transition-all block cursor-text"
                            />
                            <input
                                type="time"
                                value={time ? time.split('T')[1] : ''}
                                onChange={e => {
                                    const newTime = e.target.value;
                                    const currDate = time ? time.split('T')[0] : new Date().toISOString().split('T')[0];
                                    if (newTime) setTime(`${currDate}T${newTime}`);
                                }}
                                className="w-full bg-[#3B3B46] text-white rounded-xl py-3 px-4 text-sm outline-none focus:border focus:border-cyan-500 transition-all block cursor-text"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowAdvancedModal(false);
                                    if(repeat === 'none') setRepeat('none');
                                }}
                                className="bg-[#42424D] hover:bg-[#4E4E5A] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setRepeat('advanced');
                                    setRepeatInterval(advInterval);
                                    setRepeatUnit(advUnit);
                                    setShowAdvancedModal(false);
                                }}
                                className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showGroupModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-app-card border border-app-border w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-app-text font-bold text-lg">Seleccionar Grupo</h3>
                            <button onClick={() => setShowGroupModal(false)} className="text-app-text-muted hover:text-app-text">
                                <Trash2 size={20} className="rotate-45" />
                            </button>
                        </div>

                        {groupLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-cyan-500" size={40} />
                                <p className="text-sm text-app-text-muted">Obteniendo grupos...</p>
                            </div>
                        ) : (
                            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
                                {groups.length === 0 ? (
                                    <p className="text-center py-10 text-app-text-muted text-sm italic">No se encontraron grupos.</p>
                                ) : (
                                    groups.map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => handleSelectGroup(g)}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-app-text-muted group-hover:bg-cyan-500/20 group-hover:text-cyan-500 transition-colors">
                                                {g.subject?.substring(0, 1).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-app-text truncate">{g.subject}</p>
                                                <p className="text-[10px] text-app-text-muted truncate">{g.id}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        <div className="mt-6 pt-4 border-t border-app-border flex justify-end">
                            <button
                                onClick={() => setShowGroupModal(false)}
                                className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-app-text font-bold rounded-xl text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
