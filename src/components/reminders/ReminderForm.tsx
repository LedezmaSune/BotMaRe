import { Loader2, Save, Send, Wand2, Trash2, Plus } from 'lucide-react';
import React from 'react';
import { VariableTextarea } from '../VariableTextarea';
import { Template } from '../../types';

interface ReminderFormProps {
    title: string;
    setTitle: (val: string) => void;
    chatId: string;
    setChatId: (val: string) => void;
    text: string;
    setText: (val: string) => void;
    time: string;
    setTime: (val: string) => void;
    repeat: string;
    setRepeat: (val: string) => void;
    repeatInterval: number;
    setRepeatInterval: (val: number) => void;
    repeatUnit: string;
    setRepeatUnit: (val: string) => void;
    multipleTimes: string[];
    setMultipleTimes: (val: string[]) => void;
    setMedia: (val: File[] | null) => void;
    media: File[] | null;
    existingMedia?: string | null;
    
    editingId: number | null;
    setEditingId: (val: number | null) => void;
    loading: boolean;
    templates: Template[];
    
    onSubmit: (e: React.FormEvent) => void;
    onShowGroupModal: () => void;
    onAIPerfect: () => void;
}

export function ReminderForm({
    title, setTitle,
    chatId, setChatId,
    text, setText,
    time, setTime,
    repeat, setRepeat,
    repeatInterval, setRepeatInterval,
    repeatUnit, setRepeatUnit,
    multipleTimes, setMultipleTimes,
    media, setMedia,
    existingMedia,
    editingId, setEditingId,
    loading,
    templates,
    onSubmit,
    onShowGroupModal,
    onAIPerfect
}: ReminderFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Nombre (Opcional)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                        className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-app-text"
                        placeholder="Ej: Cumpleaños de Juan..."
                    />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest">Destinatarios</label>
                        <button
                            type="button"
                            onClick={onShowGroupModal}
                            className="text-[9px] font-black text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 uppercase tracking-tighter hover:bg-violet-500/20 transition-all"
                        >
                            Buscar Grupos
                        </button>
                    </div>
                    <textarea
                        value={chatId}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setChatId(e.target.value)}
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
                            onClick={onAIPerfect}
                            className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 rounded-lg text-[9px] font-black text-cyan-500 hover:bg-cyan-500/10 transition-all uppercase tracking-widest group"
                        >
                            <Wand2 size={12} /> IA
                        </button>
                    </div>
                    {templates.length > 0 && (
                        <select
                            value=""
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const t = templates.find(temp => temp.id === Number(e.target.value));
                                if (t) setText(t.content);
                            }}
                            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-app-border rounded-xl px-3 py-2 text-[10px] font-bold text-app-text-muted mb-2 outline-none uppercase tracking-widest"
                        >
                            <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="">-- Plantilla --</option>
                            {templates.map(t => <option className="bg-app-bg dark:bg-slate-900 text-app-text" key={t.id} value={t.id}>{t.name}</option>)}
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
                {repeat !== 'multiple_times' && (
                    <div>
                        <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Fecha y Hora</label>
                        <input
                            type="datetime-local"
                            value={time}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)}
                            className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm text-app-text"
                            required
                        />
                    </div>
                )}
                <div>
                    <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Repetición</label>
                    <select
                        value={repeat}
                        onChange={(e) => {
                            setRepeat(e.target.value);
                            if (e.target.value === 'multiple_times' && multipleTimes.length === 0) {
                                setMultipleTimes(['09:00']);
                            }
                        }}
                        className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-app-text"
                    >
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="none">Una sola vez (Sin repetir)</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="hourly">Cada hora</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="daily">Diariamente</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="weekdays">De Lunes a Viernes</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="weekly">Semanalmente</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="monthly">Mensualmente</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="multiple_times">Varias veces por día...</option>
                        <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="advanced">Personalizado...</option>
                    </select>

                    {repeat === 'multiple_times' && (
                        <div className="mt-3 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-app-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Fecha de inicio</label>
                                <input
                                    type="date"
                                    value={time ? time.split('T')[0] : ''}
                                    onChange={(e) => setTime(`${e.target.value}T00:00`)}
                                    className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-3 py-2 text-sm text-app-text outline-none focus:border-cyan-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Horarios a enviar</label>
                                <div className="space-y-2">
                                    {multipleTimes.map((t, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={t}
                                                onChange={(e) => {
                                                    const newTimes = [...multipleTimes];
                                                    newTimes[idx] = e.target.value;
                                                    setMultipleTimes(newTimes);
                                                }}
                                                className="flex-1 bg-app-bg dark:bg-background border border-app-border rounded-xl px-3 py-2 text-sm text-app-text outline-none focus:border-cyan-500"
                                                required
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setMultipleTimes(multipleTimes.filter((_, i) => i !== idx))}
                                                className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                                                disabled={multipleTimes.length <= 1}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setMultipleTimes([...multipleTimes, '12:00'])}
                                    className="mt-2 w-full py-2 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all"
                                >
                                    <Plus size={16} /> Agregar Horario
                                </button>
                            </div>
                            
                            <div>
                                <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">¿Repetir este patrón?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="multipleRepeat" 
                                            checked={repeatUnit === 'none'} 
                                            onChange={() => setRepeatUnit('none')}
                                            className="accent-cyan-500" 
                                        />
                                        Solo hoy
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="multipleRepeat" 
                                            checked={repeatUnit === 'daily'} 
                                            onChange={() => setRepeatUnit('daily')}
                                            className="accent-cyan-500" 
                                        />
                                        Diariamente
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="multipleRepeat" 
                                            checked={repeatUnit === 'weekly'} 
                                            onChange={() => setRepeatUnit('weekly')}
                                            className="accent-cyan-500" 
                                        />
                                        Semanalmente
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {repeat === 'advanced' && (
                        <div className="mt-3 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex-1">
                                <label className="text-[9px] uppercase font-bold text-app-text-muted mb-1 block">Cada</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={repeatInterval}
                                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                                    className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-3 py-2 text-sm text-app-text outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] uppercase font-bold text-app-text-muted mb-1 block">Unidad</label>
                                <select
                                    value={repeatUnit}
                                    onChange={(e) => setRepeatUnit(e.target.value)}
                                    className="w-full bg-app-bg dark:bg-background border border-app-border rounded-xl px-3 py-2 text-sm text-app-text outline-none focus:border-cyan-500"
                                >
                                    <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="hours">Horas</option>
                                    <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="days">Días</option>
                                    <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="weeks">Semanas</option>
                                    <option className="bg-app-bg dark:bg-slate-900 text-app-text" value="months">Meses</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-app-text-muted mb-1 block tracking-widest">Multimedia</label>
                    {editingId && existingMedia && (
                        <div className="mb-2 p-3 bg-app-bg dark:bg-background/50 rounded-xl border border-app-border flex items-center justify-between">
                             <span className={`text-xs font-medium truncate ${media && media.length > 0 ? 'line-through text-app-text-muted' : 'text-cyan-500'}`}>
                                Archivo actual: {existingMedia}
                             </span>
                        </div>
                    )}
                    <input
                        type="file"
                        multiple
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                                setMedia(Array.from(files));
                            } else {
                                setMedia(null);
                            }
                        }}
                        className="block w-full text-xs text-app-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200"
                    />
                    {media && media.length > 0 && (
                        <div className="mt-2 pl-1">
                            <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">{media.length} archivo(s) seleccionado(s)</span>
                        </div>
                    )}
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
    );
}
