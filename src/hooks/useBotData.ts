import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Audit, Reminder, Settings, Template, ConnectionState } from '../types';
import { parseContactList } from '../utils/contactParser';

const API_BASE = '/api';
const SOCKET_URL = ''; // En el monolito unificado, el socket vive en la misma URL/Puerto que la web

export type TabId = 'mass' | 'scheduling' | 'calendar' | 'templates' | 'groups' | 'personality' | 'settings' | 'audits';

export function useBotData() {
    const [status, setStatus] = useState<ConnectionState>('disconnected');
    const [qr, setQr] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('mass');
    const [audits, setAudits] = useState<Audit[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [prefillDate, setPrefillDate] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async (currentTab?: TabId) => {
        try {
            const [auditsRes, remindersRes, templatesRes] = await Promise.all([
                fetch(`${API_BASE}/system/audits`),
                fetch(`${API_BASE}/reminders`),
                fetch(`${API_BASE}/templates`)
            ]);

            if (auditsRes.ok) setAudits(await auditsRes.json());
            if (remindersRes.ok) setReminders(await remindersRes.json());
            if (templatesRes.ok) setTemplates(await templatesRes.json());

            if (currentTab === 'groups' || currentTab === 'mass' || currentTab === 'scheduling') {
                const groupsRes = await fetch(`${API_BASE}/whatsapp/groups`);
                if (groupsRes.ok) setGroups(await groupsRes.json());
            }

            if (!settings || currentTab === 'personality' || currentTab === 'settings') {
                const settingsRes = await fetch(`${API_BASE}/settings`);
                if (settingsRes.ok) setSettings(await settingsRes.json());
            }
        } catch (error) {
            console.error('[useBotData] Error fetching data:', error);
        }
    }, [settings]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('status', (newStatus: ConnectionState) => {
            setStatus(newStatus);
            if (newStatus === 'connected') setQr(null);
        });
        socket.on('qr', (newQr: string) => setQr(newQr));
        return () => { socket.close(); };
    }, []);

    useEffect(() => {
        void fetchData(activeTab);
        const interval = setInterval(() => {
            void fetchData(activeTab);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeTab, fetchData]);

    const handleCleanUploads = async () => {
        if (!confirm('¿Deseas limpiar archivos temporales no utilizados?')) return;
        await fetch(`${API_BASE}/system/clean-uploads`, { method: 'DELETE' });
        alert('Limpieza completada.');
    };

    const handleSendMass = async (contacts: string, message: string, media: File | null) => {
        setIsLoading(true);
        try {
            const contactList = parseContactList(contacts);
            const formData = new FormData();
            formData.append('contacts', JSON.stringify(contactList));
            formData.append('message', message);
            if (media) formData.append('media', media);

            const res = await fetch(`${API_BASE}/send-mass`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ Cola iniciada. Procesando ${contactList.length} contactos.`);
            } else {
                alert(`❌ Error: ${data.error}`);
            }
        } catch (e) {
            alert('❌ Error al procesar el envío.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAIGeneration = async (text: string) => {
        try {
            const res = await fetch(`${API_BASE}/ai/review-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await res.json();
            return data.success ? data.corrected : null;
        } catch (e) {
            return null;
        }
    };

    const handleAddReminder = async (chatId: string, text: string, time: string, media: File | null, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('chatId', chatId);
            formData.append('text', text);
            formData.append('time', time);
            if (title) formData.append('title', title);
            if (media) formData.append('media', media);
            if (repeat) formData.append('repeat', repeat);
            if (repeatInterval) formData.append('repeatInterval', repeatInterval.toString());
            if (repeatUnit) formData.append('repeatUnit', repeatUnit);

            const url = media ? `${API_BASE}/reminders/with-media` : `${API_BASE}/reminders`;
            const res = await fetch(url, {
                method: 'POST',
                body: media ? formData : JSON.stringify({ chatId, text, time, repeat, repeatInterval, repeatUnit, title }),
                headers: media ? {} : { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                void fetchData(activeTab);
                alert('✅ Recordatorio programado.');
            }
        } catch (e) {
            alert('❌ Error al programar.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteReminder = async (id: number) => {
        if (!confirm('¿Seguro que quieres eliminar este recordatorio?')) return;
        const res = await fetch(`${API_BASE}/reminders/${id}`, { method: 'DELETE' });
        if (res.ok) void fetchData(activeTab);
    };

    const handleUpdateSettings = async (newSettings: Settings | any) => {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        if (res.ok) {
            setSettings(newSettings);
            alert('✅ Configuración guardada.');
        }
    };

    const handleParseEnv = async (content: string) => {
        const res = await fetch(`${API_BASE}/settings/parse-env`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        if (res.ok) {
            void fetchData('settings');
            return true;
        }
        return false;
    };

    return {
        status,
        qr,
        activeTab,
        setActiveTab,
        audits,
        reminders,
        templates,
        groups,
        settings,
        prefillDate,
        setPrefillDate,
        isLoading,
        fetchData,
        handleCleanUploads,
        handleSendMass,
        handleAIGeneration,
        handleAddReminder,
        handleDeleteReminder,
        handleUpdateSettings,
        handleParseEnv
    };
}
