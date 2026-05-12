'use client';

import { useState, useEffect } from 'react';
import { Bell, Loader2, Send, Clock, Trash2, CheckCircle, Edit3, Zap, Save, Wand2, Plus, Upload, Download, Info, Paperclip, LayoutGrid, List } from 'lucide-react';
import { Reminder, Template } from '../types';
import { VariableTextarea } from './VariableTextarea';

interface RemindersProps {
    reminders: Reminder[];
    templates: Template[];
    onAdd: (
        chatId: string, 
        text: string, 
        time: string, 
        media: File | null, 
        repeat?: string, 
        repeatInterval?: number, 
        repeatUnit?: string, 
        title?: string,
        mediaPath?: string,
        mediaType?: string
    ) => Promise<void>;
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

    // Smart Batch States
    const [showBatchWizard, setShowBatchWizard] = useState(false);
    const [batchFiles, setBatchFiles] = useState<{name: string, path: string, date: string}[]>([]);
    const [batchChatId, setBatchChatId] = useState('');
    const [batchTime, setBatchTime] = useState('09:00');
    const [batchText, setBatchText] = useState('Adjunto envío archivo: {ARCHIVO}');

    // The SystemClock component handles its own time internally now.

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const sortedReminders = [...reminders].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // --- Componentes Internos Refactorizados ---
    


    const PendingList = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center pl-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-app-text-muted">Pendientes</h3>
                    <div className="flex bg-app-card border border-app-border rounded-xl p-1 shadow-inner scale-75 origin-left">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><List size={14} /></button>
                    </div>
                </div>
                <button onClick={async () => { if(confirm('¿Borrar TODOS los pendientes?')) { await fetch('/api/reminders/bulk?type=pending', { method: 'DELETE' }); window.location.reload(); } }} className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase">Limpiar Todo</button>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedReminders.filter(r => r.status === 'pending').map((r) => (
                        <div key={r.id} className="bg-app-card border border-app-border rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${new Date(r.time) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-background/80 text-app-text-muted'}`}>{new Date(r.time) < new Date() ? 'Expirado' : r.status}</span>
                                    {r.mediaPath && <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded-lg border border-purple-500/20"><Paperclip size={10} /> MEDIA</span>}
                                </div>
                                <span className="text-[10px] font-bold tabular-nums text-app-text-muted">{r.time}</span>
                            </div>
                            <p className="text-sm text-app-text/80 line-clamp-2 mb-4 leading-relaxed">{r.text}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-app-border">
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(r)} className="p-2 hover:bg-cyan-500/10 text-app-text-muted hover:text-cyan-500 rounded-lg transition-all"><Edit3 size={16} /></button>
                                    <button onClick={() => handleSendNow(r.id)} className="p-2 hover:bg-amber-500/10 text-app-text-muted hover:text-amber-500 rounded-lg transition-all"><Zap size={16} /></button>
                                </div>
                                <button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/70 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-app-card border border-app-border rounded-3xl overflow-hidden shadow-xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-app-bg/50 border-b border-app-border">
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Fecha / Hora</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Destinatario</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Contenido</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {sortedReminders.filter(r => r.status === 'pending').map((r) => {
                                const date = new Date(r.time);
                                const isPast = date < new Date();
                                return (
                                    <tr key={r.id} className={`hover:bg-app-bg/30 transition-colors ${isPast ? 'bg-red-500/5' : ''}`}>
                                        <td className="px-6 py-4"><p className={`text-xs font-black tabular-nums ${isPast ? 'text-red-400' : 'text-app-text'}`}>{date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p><p className="text-[10px] text-app-text-muted font-bold">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p></td>
                                        <td className="px-6 py-4"><p className="text-xs font-bold text-app-text truncate max-w-[120px]">{r.chatId}</p></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2">{r.mediaPath && <Paperclip size={10} className="text-purple-400 shrink-0" />}<p className="text-[11px] text-app-text-muted truncate max-w-[200px]">{r.text}</p></div></td>
                                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => handleEdit(r)} className="p-2 hover:bg-cyan-500/10 text-app-text-muted hover:text-cyan-500 rounded-lg transition-all"><Edit3 size={14} /></button><button onClick={() => handleSendNow(r.id)} className="p-2 hover:bg-amber-500/10 text-app-text-muted hover:text-amber-500 rounded-lg transition-all"><Zap size={14} /></button><button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/70 rounded-lg transition-all"><Trash2 size={14} /></button></div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const HistoryList = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center pl-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/70">Historial (Enviados)</h3>
                    <div className="flex bg-app-card border border-app-border rounded-xl p-1 shadow-inner scale-75 origin-left">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500 text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}><List size={14} /></button>
                    </div>
                </div>
                <button onClick={async () => { if(confirm('¿Limpiar historial?')) { await fetch('/api/reminders/bulk?type=sent', { method: 'DELETE' }); window.location.reload(); } }} className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase">Limpiar Historial</button>
            </div>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reminders.filter(r => r.status === 'sent').sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((r) => (
                        <div key={r.id} className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl p-6 shadow-lg overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-emerald-500/20 text-[10px] font-black text-emerald-400 rounded-lg uppercase tracking-wider">Entregado</span>
                                    {r.mediaPath && <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded-lg border border-purple-500/20"><Paperclip size={10} /> MEDIA</span>}
                                </div>
                                <span className="text-[10px] font-bold tabular-nums text-app-text-muted">{r.time}</span>
                            </div>
                            <p className="text-sm text-app-text-muted/80 line-clamp-3 mb-4 leading-relaxed line-through decoration-slate-400/30">{r.text}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-app-border">
                                <span className="text-[10px] text-app-text-muted font-bold truncate max-w-[140px]">A: {r.chatId}</span>
                                <button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/60 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-app-card border border-app-border rounded-3xl overflow-hidden shadow-xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-app-bg/50 border-b border-app-border">
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Fecha / Hora</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Destinatario</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Contenido</th>
                                <th className="px-6 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {reminders.filter(r => r.status === 'sent').sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((r) => {
                                const date = new Date(r.time);
                                return (
                                    <tr key={r.id} className="hover:bg-app-bg/30 transition-colors">
                                        <td className="px-6 py-4"><p className="text-xs font-black tabular-nums text-app-text-muted">{date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p><p className="text-[10px] text-app-text-muted font-bold">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p></td>
                                        <td className="px-6 py-4"><p className="text-xs font-bold text-app-text-muted truncate max-w-[120px]">{r.chatId}</p></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2">{r.mediaPath && <Paperclip size={10} className="text-purple-400/50 shrink-0" />}<p className="text-[11px] text-app-text-muted/80 truncate max-w-[200px] line-through decoration-slate-400/30">{r.text}</p></div></td>
                                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => onDelete(r.id)} className="p-2 hover:bg-red-500/10 text-red-500/70 rounded-lg transition-all"><Trash2 size={14} /></button></div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );



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
        setTime(r.time); 
        setRepeat(r.repeat || 'none');
        setRepeatInterval(r.repeatInterval || 1);
        setRepeatUnit(r.repeatUnit || 'days');
        setMode('single');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSendNow = async (id: number) => {
        if (!confirm('¿Enviar este mensaje ahora mismo?')) return;
        setLoading(true);
        try {
            await fetch(`/api/reminders/${id}/send-now`, { method: 'POST' });
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

    const [mode, setMode] = useState<'single' | 'bulk'>('single');

    const handleBatchUploadAndProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!batchChatId) {
            e.target.value = '';
            return alert('Por favor ingresa un destinatario antes de subir los archivos.');
        }
        const files = e.target.files; if (!files) return;
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
        
        setLoading(true);
        try {
            const res = await fetch('/api/system/upload-multiple', { method: 'POST', body: formData });
            const d = await res.json();
            if (res.ok) {
                const filesWithDates = (d.files || []).map((f: any) => {
                    // 1. Intentar YYYY-MM-DD (ej. WhatsApp IMG-20260511-WA001)
                    const isoMatch = f.name.match(/(\d{4})[-._]?(\d{2})[-._]?(\d{2})/);
                    if (isoMatch) {
                        const [_, y, m, day] = isoMatch;
                        const mNum = parseInt(m), dNum = parseInt(day);
                        if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
                            return { ...f, date: `${y}-${m}-${day}` };
                        }
                    }

                    // 2. Intentar DD-MM-YYYY, DD-MM-YY, o solo DD-MM (asume año actual)
                    const match = f.name.match(/(\d{2})[-._]?(\d{2})(?:[-._]?(\d{4}|\d{2}))?\b/);
                    if (match) {
                        const [_, day, m, yStr] = match;
                        const dNum = parseInt(day);
                        const mNum = parseInt(m);
                        
                        // Validación básica de día y mes
                        if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
                            let y = new Date().getFullYear().toString();
                            if (yStr) {
                                y = yStr.length === 2 ? `20${yStr}` : yStr;
                            }
                            return { ...f, date: `${y}-${m}-${day}` };
                        }
                    }
                    return { ...f, date: null };
                });

                const withDate = filesWithDates.filter((f: any) => f.date);
                if (withDate.length > 0) {
                    for (const file of withDate) {
                        const finalTime = `${file.date}T${batchTime}`;
                        const finalText = batchText.replace('{ARCHIVO}', file.name);
                        await onAdd(batchChatId, finalText, finalTime, null, 'none', 1, 'days', file.name, file.path);
                    }
                    setShowBatchWizard(false);
                    alert(`✅ ${withDate.length} recordatorios programados exitosamente.`);
                } else {
                    alert(`✅ Archivos subidos, pero no se detectaron fechas DDMMYYYY en los nombres para auto-programar.`);
                }
            } else {
                alert(`❌ Error: ${d.error || 'Fallo desconocido'}`);
            }
        } catch (err) {
            alert('❌ Error de conexión.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="relative min-h-screen">
            {loading && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 p-8 bg-app-card border border-app-border rounded-3xl shadow-2xl animate-in zoom-in duration-300">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                        <p className="text-sm font-black uppercase tracking-widest text-app-text animate-pulse">Procesando Lote...</p>
                    </div>
                </div>
            )}

            {showBatchWizard && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
                    <div className="bg-app-card border border-app-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                                <Zap size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-app-text tracking-tight">Asistente Inteligente</h2>
                                <p className="text-app-text-muted text-xs font-medium">Configura los datos y luego sube tus archivos.</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] uppercase font-black text-app-text-muted tracking-widest">Destinatario Global</label>
                                    <button onClick={() => { setShowGroupModal(true); fetchGroups(); }} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">Buscar Grupos</button>
                                </div>
                                <input
                                    type="text"
                                    value={batchChatId}
                                    onChange={(e) => setBatchChatId(e.target.value)}
                                    className="w-full bg-app-bg dark:bg-background border border-app-border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-app-text shadow-inner"
                                    placeholder="Número o ID de grupo..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-app-text-muted mb-2 block tracking-widest">Hora de Envío</label>
                                    <input
                                        type="time"
                                        value={batchTime}
                                        onChange={(e) => setBatchTime(e.target.value)}
                                        className="w-full bg-app-bg dark:bg-background border border-app-border rounded-2xl px-5 py-4 text-sm text-app-text outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>
                                <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 flex flex-col justify-center">
                                    <p className="text-[9px] font-bold text-purple-400 uppercase mb-1">Detección Automática</p>
                                    <p className="text-[10px] text-app-text-muted leading-tight">Usa formatos como <b className="text-purple-400">DD-MM</b> (toma el año actual) o <b className="text-purple-400">DD-MM-YYYY</b> en el nombre del archivo.</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-app-text-muted mb-2 block tracking-widest">Mensaje Global</label>
                                <textarea
                                    value={batchText}
                                    onChange={(e) => setBatchText(e.target.value)}
                                    className="w-full h-28 bg-app-bg dark:bg-background border border-app-border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none resize-none transition-all text-app-text shadow-inner custom-scrollbar"
                                    placeholder="Usa {ARCHIVO} para poner el nombre del archivo..."
                                />
                                <p className="text-[9px] text-app-text-muted mt-2 italic">* Usa {"{ARCHIVO}"} para insertar el nombre real del archivo.</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => { setShowBatchWizard(false); }}
                                    className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-app-text-muted rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <label className="flex-[2] flex items-center justify-center cursor-pointer py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    Subir Archivos y Programar
                                    <input type="file" className="hidden" multiple onChange={handleBatchUploadAndProcess} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
 
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
             {/* Sidebar con Modos */}
             <section className="lg:col-span-1 space-y-6">


                <div className="bg-app-card border border-app-border rounded-2xl p-1.5 flex gap-1 shadow-inner">
                    <button 
                        onClick={() => setMode('single')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'single' ? 'bg-indigo-600 text-white shadow-lg' : 'text-app-text-muted hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                    >
                        <Plus size={14} /> Individual
                    </button>
                    <button 
                        onClick={() => setMode('bulk')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'bulk' ? 'bg-emerald-600 text-white shadow-lg' : 'text-app-text-muted hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                    >
                        <Zap size={14} /> Carga Masiva
                    </button>
                </div>

                {mode === 'single' ? (
                    <div className="bg-app-card border border-app-border rounded-3xl p-5 md:p-6 backdrop-blur-xl animate-in fade-in slide-in-from-left-4 duration-500 shadow-2xl h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                {editingId ? <Edit3 size={20} className="md:w-6 md:h-6" /> : <Bell size={20} className="md:w-6 md:h-6" />}
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-app-text leading-tight">{editingId ? 'Editar' : 'Programar'}</h2>
                                <p className="text-app-text-muted text-[10px] md:text-xs">Añade un recordatorio a la vez.</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Nombre (Opcional)</label>
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
                                        <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Destinatarios</label>
                                        <button
                                            type="button"
                                            onClick={() => { setShowGroupModal(true); fetchGroups(); }}
                                            className="text-[9px] font-black text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 uppercase tracking-tighter hover:bg-violet-500/20 transition-all"
                                        >
                                            Buscar Grupos
                                        </button>
                                    </div>
                                    <textarea
                                        value={chatId}
                                        onChange={(e) => setChatId(e.target.value)}
                                        className="w-full h-24 bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none transition-all text-app-text custom-scrollbar"
                                        placeholder="Número o ID de grupo..."
                                        required
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Mensaje</label>
                                        <button
                                            type="button"
                                            onClick={handleAIPerfect}
                                            className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 rounded-lg text-[9px] font-black text-cyan-500 hover:bg-cyan-500/10 transition-all uppercase tracking-widest group"
                                        >
                                            <Wand2 size={12} /> IA
                                        </button>
                                    </div>
                                    {templates.length > 0 && (
                                        <select
                                            onChange={(e) => {
                                                const t = templates.find(temp => temp.id === Number(e.target.value));
                                                if (t) setText(t.content);
                                                e.target.value = "";
                                            }}
                                            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-app-border rounded-xl px-3 py-2 text-[10px] font-bold text-app-text-muted mb-2 outline-none uppercase tracking-widest"
                                        >
                                            <option value="">-- Plantilla --</option>
                                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    )}
                                    <VariableTextarea
                                        value={text}
                                        onChange={(val) => setText(val)}
                                        className="w-full h-44 bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none text-app-text shadow-inner"
                                        placeholder="Escribe tu mensaje..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Fecha y Hora</label>
                                    <input
                                        type="datetime-local"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm text-app-text"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Multimedia</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setMedia(e.target.files?.[0] || null)}
                                        className="block w-full text-xs text-app-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingId(null); setChatId(''); setTitle(''); setText(''); setTime(''); }}
                                        className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-app-text-muted rounded-2xl font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-[2] py-4 ${editingId ? 'bg-purple-600' : 'bg-cyan-600'} text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all`}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (editingId ? <Save size={20} /> : <Send size={20} />)}
                                    {loading ? 'Procesando...' : (editingId ? 'Guardar Cambios' : 'Programar')}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-app-card border border-app-border rounded-3xl p-6 backdrop-blur-xl animate-in zoom-in-95 duration-300 shadow-2xl h-fit space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-app-text leading-tight">Carga Masiva</h2>
                                <p className="text-app-text-muted text-[10px]">Gestión rápida por JSON.</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const blob = new Blob([JSON.stringify(reminders, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a'); a.href = url; a.download = `agenda.json`; a.click();
                                }}
                                className="w-full flex items-center justify-between p-4 bg-app-bg dark:bg-background/40 border border-app-border rounded-2xl hover:border-cyan-500/50 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500"><Save size={18} /></div>
                                    <span className="text-xs font-bold text-app-text">Exportar JSON</span>
                                </div>
                            </button>

                            <label className="w-full flex items-center justify-between p-4 bg-app-bg dark:bg-background/40 border border-app-border rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Upload size={18} /></div>
                                    <span className="text-xs font-bold text-app-text">Importar JSON</span>
                                </div>
                                <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                        try {
                                            const data = JSON.parse(ev.target?.result as string);
                                            const toImport = Array.isArray(data) ? data : (data.reminders || []);
                                            if (confirm(`¿Importar ${toImport.length} mensajes?`)) {
                                                for (const r of toImport) {
                                                    await onAdd(r.chatId, r.text, r.time, null, r.repeat, r.repeatInterval, r.repeatUnit, r.title, r.mediaPath, r.mediaType);
                                                }
                                                alert('✅ Importado.');
                                            }
                                        } catch (err) { alert('❌ Error.'); }
                                    };
                                    reader.readAsText(file);
                                }} />
                            </label>

                            <button type="button" onClick={() => setShowBatchWizard(true)} className="w-full flex items-center justify-between p-4 bg-app-bg dark:bg-background/40 border border-app-border rounded-2xl hover:border-purple-500/50 transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Upload size={18} /></div>
                                    <span className="text-xs font-bold text-app-text">Asistente Inteligente (Lote)</span>
                                </div>
                            </button>
                        </div>
                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                            <Info size={14} className="text-amber-500 mb-1" />
                            <p className="text-[10px] text-app-text-muted italic leading-relaxed">
                                1. Sube tus fotos con "Lote".<br/>
                                2. Importa el JSON.<br/>
                                3. ¡Listo!
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {/* List Section */}
            <section className="lg:col-span-2 space-y-8">
                {PendingList()}
                {HistoryList()}
            </section>
        </div>
        {/* Modals */}
            {showGroupModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-app-card border border-app-border w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-app-text font-bold text-lg">Grupos</h3>
                            <button onClick={() => setShowGroupModal(false)}><Trash2 size={20} className="rotate-45 text-app-text-muted" /></button>
                        </div>
                        <div className="space-y-2 overflow-y-auto custom-scrollbar">
                            {groupLoading ? <p className="text-center py-10 text-app-text-muted">Cargando...</p> : 
                             groups.map(g => (
                                 <button key={g.id} onClick={() => handleSelectGroup(g)} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-cyan-500/10 text-left transition-all border border-transparent hover:border-cyan-500/20">
                                     <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-black">{g.subject?.charAt(0)}</div>
                                     <div className="min-w-0"><p className="text-sm font-bold truncate">{g.subject}</p><p className="text-[10px] text-app-text-muted">{g.id}</p></div>
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
