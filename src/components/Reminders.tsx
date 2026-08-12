'use client';
import React from 'react';
import { AnimatePresence } from 'framer-motion';

import { Bell, Loader2, Edit3, Zap, Save, Plus, Upload, Info } from 'lucide-react';
import { ReminderForm } from './reminders/ReminderForm';
import { Reminder, Template } from '../types';
import { PendingList } from './reminders/PendingList';
import { HistoryList } from './reminders/HistoryList';
import { GroupModal } from './reminders/GroupModal';
import { BatchWizard } from './reminders/BatchWizard';
import { useRemindersLogic } from './reminders/hooks/useRemindersLogic';

interface RemindersProps {
    reminders: Reminder[];
    templates: Template[];
    onAdd: (chatId: string, text: string, time: string, media: File[] | File | null, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string, mediaPath?: string, mediaType?: string) => Promise<void>;
    onAddBulk?: (items: Array<any>) => Promise<boolean>;
    onDelete: (id: number) => Promise<void>;
    initialTime?: string;
    initialId?: number | null;
    onClearInitialId?: () => void;
    onRefresh?: () => void;
}

export function Reminders({ reminders, templates, onAdd, onAddBulk, onDelete, initialTime, initialId, onClearInitialId, onRefresh }: RemindersProps) {
    const {
        mode, setMode,
        viewMode, setViewMode,
        pendingPage, setPendingPage,
        historyPage, setHistoryPage,
        sortedReminders,
        
        showGroupModal, setShowGroupModal,
        groups, groupLoading,
        fetchGroups, handleSelectGroup,

        chatId, setChatId,
        title, setTitle,
        text, setText,
        time, setTime,
        media, setMedia,
        existingMedia,
        repeat, setRepeat,
        repeatInterval, setRepeatInterval,
        repeatUnit, setRepeatUnit,
        multipleTimes, setMultipleTimes,
        channel, setChannel,
        loading, setLoading,
        editingId, setEditingId,
        handleSubmit, handleEdit, handleSendNow, handleAIPerfect,

        showBatchWizard, setShowBatchWizard,
        batchChatId, setBatchChatId,
        batchTime, setBatchTime,
        batchText, setBatchText,
        batchChannel, setBatchChannel,
        batchProgress,
        handleBatchUploadAndProcess,
        handleScanFolder
    } = useRemindersLogic(reminders, onAdd, initialTime, initialId, onClearInitialId, onAddBulk, onRefresh);

    return (
        <div className="relative min-h-screen">
            {loading && !batchProgress && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 p-8 bg-app-card border border-app-border rounded-3xl shadow-2xl animate-in zoom-in duration-300">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                        <p className="text-sm font-black uppercase tracking-widest text-app-text animate-pulse">Procesando Lote...</p>
                    </div>
                </div>
            )}

            <AnimatePresence>
            {showBatchWizard && (
                <BatchWizard
                    batchChatId={batchChatId}
                    setBatchChatId={setBatchChatId}
                    batchTime={batchTime}
                    setBatchTime={setBatchTime}
                    batchText={batchText}
                    setBatchText={setBatchText}
                    batchChannel={batchChannel}
                    setBatchChannel={setBatchChannel}
                    onOpenGroupModal={() => { setShowGroupModal(true); fetchGroups(); }}
                    onClose={() => setShowBatchWizard(false)}
                    onUpload={handleBatchUploadAndProcess}
                    onScanFolder={handleScanFolder}
                    batchProgress={batchProgress}
                />
            )}
            </AnimatePresence>

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
                            <ReminderForm
                                title={title} setTitle={setTitle}
                                chatId={chatId} setChatId={setChatId}
                                text={text} setText={setText}
                                time={time} setTime={setTime}
                                repeat={repeat} setRepeat={setRepeat}
                                repeatInterval={repeatInterval} setRepeatInterval={setRepeatInterval}
                                repeatUnit={repeatUnit} setRepeatUnit={setRepeatUnit}
                                multipleTimes={multipleTimes} setMultipleTimes={setMultipleTimes}
                                channel={channel} setChannel={setChannel}
                                media={media}
                                setMedia={setMedia}
                                existingMedia={existingMedia}
                                editingId={editingId} setEditingId={setEditingId}
                                loading={loading}
                                templates={templates}
                                onSubmit={handleSubmit}
                                onShowGroupModal={() => { setShowGroupModal(true); fetchGroups(); }}
                                onAIPerfect={handleAIPerfect}
                            />
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
                                    <input type="file" className="hidden" accept=".json" onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const file = e.target.files?.[0]; if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = async (ev) => {
                                            try {
                                                const data = JSON.parse(ev.target?.result as string);
                                                const toImport = Array.isArray(data) ? data : (data.reminders || []);
                                                if (toImport.length === 0) return alert('No se encontraron recordatorios en el archivo JSON.');
                                                if (confirm(`¿Importar ${toImport.length} mensajes?`)) {
                                                    if (onAddBulk) {
                                                        const success = await onAddBulk(toImport);
                                                        if (success) alert(`✅ ${toImport.length} recordatorios importados exitosamente.`);
                                                    } else {
                                                        for (const r of toImport) {
                                                            await onAdd(r.chatId, r.text, r.time, null, r.repeat, r.repeatInterval, r.repeatUnit, r.title, r.mediaPath, r.mediaType);
                                                        }
                                                        onRefresh?.();
                                                        alert('✅ Importado.');
                                                    }
                                                }
                                            } catch (err) { alert('❌ Error al procesar el archivo JSON.'); }
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
                    <PendingList reminders={sortedReminders} viewMode={viewMode} setViewMode={setViewMode} pendingPage={pendingPage} setPendingPage={setPendingPage} onEdit={handleEdit} onSendNow={handleSendNow} onDelete={onDelete} onRefresh={onRefresh} />
                    <HistoryList reminders={reminders} viewMode={viewMode} setViewMode={setViewMode} historyPage={historyPage} setHistoryPage={setHistoryPage} onDelete={onDelete} onRefresh={onRefresh} />
                </section>
            </div>
            
            {/* Modals */}
            {showGroupModal && (
                <GroupModal
                    groups={groups}
                    groupLoading={groupLoading}
                    onClose={() => setShowGroupModal(false)}
                    onSelectGroup={handleSelectGroup}
                />
            )}
        </div>
    );
}