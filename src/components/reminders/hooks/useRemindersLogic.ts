import React, { useState, useEffect } from 'react';
import { Reminder } from '../../../types';
import { parseDateFromFilename } from '../../../utils/dateParser';

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
        mediaType?: string,
        channel?: string
    ) => Promise<void>,
    initialTime?: string,
    initialId?: number | null,
    onClearInitialId?: () => void,
    onAddBulk?: (items: Array<any>) => Promise<boolean>,
    onRefresh?: () => void
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
    const [existingMedia, setExistingMedia] = useState<string | null>(null);
    const [repeat, setRepeat] = useState('none');
    const [repeatInterval, setRepeatInterval] = useState(1);
    const [repeatUnit, setRepeatUnit] = useState('days');
    const [multipleTimes, setMultipleTimes] = useState<string[]>([]);
    const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

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
                setExistingMedia(reminderToEdit.mediaPath ? reminderToEdit.mediaPath.split(/[\\/]/).pop() || null : null);
                setChannel(reminderToEdit.channel || 'whatsapp');
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
    const [batchChannel, setBatchChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
    const [batchProgress, setBatchProgress] = useState<{current: number, total: number, filename: string, label?: string, description?: string} | null>(null);

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
            if (media && media.length > 0) {
                const formData = new FormData();
                formData.append('chatId', chatId);
                formData.append('text', text);
                formData.append('time', time);
                formData.append('repeat', repeat);
                formData.append('repeatInterval', String(repeatInterval));
                formData.append('repeatUnit', repeatUnit);
                formData.append('channel', channel);
                if (title) formData.append('title', title);
                formData.append('media', media[0]);

                await fetch(`/api/reminders/${editingId}`, {
                    method: 'PATCH',
                    body: formData
                });
            } else {
                await fetch(`/api/reminders/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId, text, time, repeat, repeatInterval, repeatUnit, title, channel })
                });
            }
            setEditingId(null);
        } else {
            if (repeat === 'multiple_times' && multipleTimes.length > 0) {
                const baseDate = time ? time.split('T')[0] : new Date().toISOString().split('T')[0];
                const actualRepeat = repeatUnit === 'weekly' ? 'weekly' : (repeatUnit === 'daily' ? 'daily' : 'none');
                
                for (const t of multipleTimes) {
                    const nextTimeStr = `${baseDate}T${t}`;
                    await onAdd(chatId, text, nextTimeStr, media, actualRepeat, 1, 'days', title, undefined, undefined, channel);
                }
            } else {
                await onAdd(chatId, text, time, media, repeat, repeatInterval, repeatUnit, title, undefined, undefined, channel);
            }
        }
        setChatId('');
        setTitle('');
        setText('');
        setTime('');
        setMedia(null);
        setExistingMedia(null);
        setRepeat('none');
        setRepeatInterval(1);
        setRepeatUnit('days');
        setMultipleTimes([]);
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
        setExistingMedia(r.mediaPath ? r.mediaPath.split(/[\\/]/).pop() || null : null);
        setChannel(r.channel || 'whatsapp');
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
        const files = e.target.files; if (!files || files.length === 0) return;
        
        setLoading(true);
        const uploadedFiles: any[] = [];
        let uploadFailed = false;

        try {
            // Fase 1: Subida de archivos en lotes (evita sobrecargas y timeouts)
            const CHUNK_SIZE = 10;
            const fileList = Array.from(files);
            for (let i = 0; i < fileList.length; i += CHUNK_SIZE) {
                const chunk = fileList.slice(i, i + CHUNK_SIZE);
                const currentEnd = Math.min(i + CHUNK_SIZE, fileList.length);

                setBatchProgress({ 
                    current: currentEnd, 
                    total: fileList.length, 
                    filename: chunk.map(f => f.name).join(', '),
                    label: "Subiendo Archivos...",
                    description: `Transfiriendo archivos al servidor (${currentEnd}/${fileList.length}).`
                });

                const formData = new FormData();
                chunk.forEach(f => formData.append('files', f));

                try {
                    const res = await fetch('/api/system/upload-multiple', { method: 'POST', body: formData });
                    const d = await res.json();
                    
                    if (res.ok && d.success && Array.isArray(d.files)) {
                        uploadedFiles.push(...d.files);
                    } else {
                        const errMsg = d.error?.message || d.error || 'Error desconocido';
                        if (!confirm(`❌ Falló la subida de un bloque de archivos.\nMotivo: ${errMsg}\n\n¿Deseas continuar con los que se hayan subido?`)) {
                            uploadFailed = true;
                            break;
                        }
                    }
                } catch (err: any) {
                    if (!confirm(`❌ Error de conexión al subir archivos.\n\n¿Deseas continuar con los ya procesados?`)) {
                        uploadFailed = true;
                        break;
                    }
                }
            }

            if (uploadFailed && uploadedFiles.length === 0) {
                alert('⚠️ Proceso cancelado o no se subió ningún archivo.');
                return;
            }

            // Fase 2: Detección y procesamiento inteligente de fechas con parseDateFromFilename
            const filesWithDates = uploadedFiles.map((f: any) => {
                const parsed = parseDateFromFilename(f.name, batchTime);
                return {
                    ...f,
                    parsed
                };
            });

            const withDate = filesWithDates.filter((f: any) => f.parsed !== null);
            if (withDate.length > 0) {
                // Fase 3: Programación masiva en lote único
                setBatchProgress({ 
                    current: withDate.length, 
                    total: withDate.length, 
                    filename: 'Guardando en agenda...',
                    label: "Programando Mensajes...",
                    description: "Registrando recordatorios en el sistema..."
                });

                const bulkItems = withDate.map((file: any) => ({
                    chatId: batchChatId,
                    text: batchText.replace('{ARCHIVO}', file.name),
                    time: file.parsed.time,
                    title: file.name,
                    mediaPath: file.path,
                    repeat: 'none',
                    channel: batchChannel
                }));

                if (onAddBulk) {
                    await onAddBulk(bulkItems);
                } else {
                    for (const item of bulkItems) {
                        await onAdd(item.chatId, item.text, item.time, null, item.repeat, 1, 'days', item.title, item.mediaPath, undefined, item.channel);
                    }
                    onRefresh?.();
                }

                setShowBatchWizard(false);
                alert(`✅ ${withDate.length} recordatorios programados exitosamente.`);
            } else {
                alert(`✅ ${uploadedFiles.length} archivos subidos correctamente, pero no se detectaron fechas válidas en los nombres para auto-programar.`);
            }
        } catch (err) {
            alert('❌ Ocurrió un error inesperado al procesar el lote.');
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
                    globalText: batchText,
                    channel: batchChannel
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Escaneo completado. Se agregaron ${data.added} nuevos recordatorios desde la carpeta.`);
                setShowBatchWizard(false);
                onRefresh?.();
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
        existingMedia, setExistingMedia,
        loading, setLoading,
        editingId, setEditingId,
        repeat, setRepeat,
        repeatInterval, setRepeatInterval,
        repeatUnit, setRepeatUnit,
        multipleTimes, setMultipleTimes,
        channel, setChannel,
        handleSubmit, handleEdit, handleSendNow, handleAIPerfect,

        showBatchWizard, setShowBatchWizard,
        batchChatId, setBatchChatId,
        batchTime, setBatchTime,
        batchText, setBatchText,
        batchChannel, setBatchChannel,
        batchProgress,
        handleBatchUploadAndProcess,
        handleScanFolder
    };
}
