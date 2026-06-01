import React, { useState, useEffect } from 'react';
import { Reminder } from '../../../types';

export function useRemindersLogic(
    reminders: Reminder[],
    onAdd: (
        chatId: string, 
        text: string, 
        time: string, 
        media: File[] | File | null, 
        repeat?: string, 
        repeatInterval?: number, 
        repeatUnit?: string, 
        title?: string,
        mediaPath?: string,
        mediaType?: string
    ) => Promise<void>,
    initialTime?: string,
    initialId?: number | null,
    onClearInitialId?: () => void
) {
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    
    // Group State
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [groupLoading, setGroupLoading] = useState(false);

    // Form State
    const [chatId, setChatId] = useState('');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [time, setTime] = useState(initialTime || '');
    const [media, setMedia] = useState<File[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [repeat, setRepeat] = useState('none');
    const [repeatInterval, setRepeatInterval] = useState(1);
    const [repeatUnit, setRepeatUnit] = useState('days');

    useEffect(() => {
        if (initialTime) setTime(initialTime);
    }, [initialTime]);

    useEffect(() => {
        if (initialId && reminders.length > 0) {
            const reminderToEdit = reminders.find(r => r.id === initialId);
            if (reminderToEdit) {
                // Inline handleEdit behavior
                setEditingId(reminderToEdit.id);
                setChatId(reminderToEdit.chatId);
                setTitle(reminderToEdit.title || '');
                setText(reminderToEdit.text);
                setTime(reminderToEdit.time); 
                setRepeat(reminderToEdit.repeat || 'none');
                setRepeatInterval(reminderToEdit.repeatInterval || 1);
                setRepeatUnit(reminderToEdit.repeatUnit || 'days');
                setMode('single');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (onClearInitialId) onClearInitialId();
            }
        }
    }, [initialId, reminders, onClearInitialId]);

    // Batch State
    const [showBatchWizard, setShowBatchWizard] = useState(false);
    const [batchChatId, setBatchChatId] = useState('');
    const [batchTime, setBatchTime] = useState('09:00');
    const [batchText, setBatchText] = useState('Adjunto archivo: {ARCHIVO}');
    const [batchProgress, setBatchProgress] = useState<{current: number, total: number, filename: string} | null>(null);

    const sortedReminders = [...reminders].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

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
        if (mode === 'single') setChatId(g.id);
        else setBatchChatId(g.id);
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
                    const currentYear = new Date().getFullYear().toString();
                    const isoMatch = f.name.match(/(\d{4})[-._]?(\d{2})[-._]?(\d{2})/);
                    if (isoMatch) {
                        const [_, _y, m, day] = isoMatch;
                        const mNum = parseInt(m), dNum = parseInt(day);
                        if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
                            return { ...f, date: `${currentYear}-${m}-${day}` }; 
                        }
                    }
                    const match = f.name.match(/(\d{2})[-._]?(\d{2})(?:[-._]?(\d{4}|\d{2}))?\b/);
                    if (match) {
                        const [_, day, m, _yStr] = match;
                        const dNum = parseInt(day);
                        const mNum = parseInt(m);
                        if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
                            return { ...f, date: `${currentYear}-${m}-${day}` };
                        }
                    }
                    return { ...f, date: null };
                });

                const withDate = filesWithDates.filter((f: any) => f.date);
                if (withDate.length > 0) {
                    setBatchProgress({ current: 0, total: withDate.length, filename: 'Iniciando...' });
                    let current = 0;
                    for (const file of withDate) {
                        current++;
                        setBatchProgress({ current, total: withDate.length, filename: file.name });
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
            setBatchProgress(null);
            e.target.value = '';
        }
    };

    const handleScanFolder = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reminders/bulk/scan-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    globalChatId: batchChatId,
                    globalTime: batchTime,
                    globalText: batchText
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Escaneo completado. Se agregaron ${data.added} nuevos recordatorios desde la carpeta.`);
                setShowBatchWizard(false);
                // Trigger a refresh somehow, or the parent component should do it.
                // Normally the parent refetches every minute, but we can do a window reload for now.
                window.location.reload();
            } else {
                alert(`❌ Error en el escaneo: ${data.message || data.error || 'Desconocido'}`);
            }
        } catch (err) {
            alert('❌ Error de conexión al escanear.');
        } finally {
            setLoading(false);
        }
    };

    return {
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
        loading, setLoading,
        editingId, setEditingId,
        repeat, setRepeat,
        repeatInterval, setRepeatInterval,
        repeatUnit, setRepeatUnit,
        handleSubmit, handleEdit, handleSendNow, handleAIPerfect,

        showBatchWizard, setShowBatchWizard,
        batchChatId, setBatchChatId,
        batchTime, setBatchTime,
        batchText, setBatchText,
        batchProgress,
        handleBatchUploadAndProcess,
        handleScanFolder
    };
}
