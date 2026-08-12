import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Audit, Reminder, Settings, Template, ConnectionState, Autoresponder } from '../types';
import { parseContactList } from '../utils/contactParser';

const API_BASE = '/api';
const SOCKET_URL = ''; // En el monolito unificado, el socket vive en la misma URL/Puerto que la web

export type TabId = 'mass' | 'scheduling' | 'calendar' | 'templates' | 'groups' | 'personality' | 'settings' | 'audits' | 'support' | 'manual' | 'updates' | 'autoresponders' | 'sheets' | 'telemetry' | 'access' | 'crm' | 'webhooks' | 'plugins';

export function useBotData() {
    const [status, setStatus] = useState<ConnectionState>('disconnected');
    const [qr, setQr] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('mass');
    const [audits, setAudits] = useState<Audit[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [autoresponders, setAutoresponders] = useState<Autoresponder[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [allowedGroups, setAllowedGroups] = useState<string[]>([]);
    const [prefillDate, setPrefillDate] = useState<string>('');
    const [prefillReminderId, setPrefillReminderId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [diffusionProgress, setDiffusionProgress] = useState<{current: number, total: number, percentage: number} | null>(null);
    const [diffusionLogs, setDiffusionLogs] = useState<any[]>([]);
    const [networkStatus, setNetworkStatus] = useState<any>(null);

    const fetchData = useCallback(async (currentTab?: TabId) => {
        try {
            const [auditsRes, remindersRes, templatesRes, autorespondersRes] = await Promise.all([
                fetch(`${API_BASE}/system/audits`),
                fetch(`${API_BASE}/reminders`),
                fetch(`${API_BASE}/templates`),
                fetch(`${API_BASE}/autoresponders`)
            ]);

            if (auditsRes.ok) setAudits(await auditsRes.json());
            if (remindersRes.ok) setReminders(await remindersRes.json());
            if (templatesRes.ok) setTemplates(await templatesRes.json());
            if (autorespondersRes.ok) setAutoresponders(await autorespondersRes.json());

            if (currentTab === 'groups' || currentTab === 'mass' || currentTab === 'scheduling') {
                const groupsRes = await fetch(`${API_BASE}/whatsapp/groups`);
                if (groupsRes.ok) {
                    const newGroups = await groupsRes.json();
                    // Solo actualizamos si la respuesta tiene datos o si es la primera vez que cargamos
                    if (newGroups.length > 0 || groups.length === 0) {
                        setGroups(newGroups);
                    }
                }
            }

            if (!settings || currentTab === 'personality' || currentTab === 'settings' || currentTab === 'groups') {
                const settingsRes = await fetch(`${API_BASE}/settings`);
                if (settingsRes.ok) {
                    const s = await settingsRes.json();
                    setSettings(s);
                    if (s.ALLOWED_GROUPS) {
                        setAllowedGroups(s.ALLOWED_GROUPS.split(',').map((id: string) => id.trim()));
                    } else {
                        setAllowedGroups([]);
                    }
                }
            }

            if (currentTab === 'settings' || !networkStatus) {
                const netRes = await fetch(`${API_BASE}/system/network`);
                if (netRes.ok) {
                    const n = await netRes.json();
                    if (n.success) setNetworkStatus(n.network);
                }
            }

            // Consultar si hay una difusión masiva en progreso al abrir la pestaña
            if (currentTab === 'mass' && !diffusionProgress) {
                try {
                    const massRes = await axios.get(`${API_BASE}/send-mass/status`);
                    if (massRes.data?.progress) {
                        setDiffusionProgress(massRes.data.progress);
                    }
                } catch (e) {}
            }
        } catch (error) {
            console.error('[useBotData] Error fetching data:', error);
        }
    }, [settings, networkStatus, groups.length, diffusionProgress]);

    useEffect(() => {
        // Consultar el estado inicial inmediatamente vía REST
        fetch(`${API_BASE}/whatsapp/status`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.state) setStatus(data.state);
                if (data?.qr) setQr(data.qr);
            })
            .catch(() => null);

        // Consultar si hay difusión masiva en curso
        axios.get(`${API_BASE}/send-mass/status`)
            .then(res => {
                if (res.data?.progress) setDiffusionProgress(res.data.progress);
            })
            .catch(() => null);

        const socket = io(SOCKET_URL);
        socket.on('status', (newStatus: ConnectionState) => {
            setStatus(newStatus);
            if (newStatus === 'connected') {
                setQr(null);
                setPairingCode(null);
            }
        });
        socket.on('qr', (newQr: string) => {
            setQr(newQr);
            setStatus('connecting');
        });
        
        socket.on('diffusion_progress', (data) => {
            setDiffusionProgress(data);
        });

        socket.on('diffusion_completed', () => {
            setTimeout(() => {
                setDiffusionProgress(null);
                setDiffusionLogs([]);
            }, 6000); // Mantener 6 segundos el éxito
        });

        socket.on('diffusion_log', (log) => {
            setDiffusionLogs(prev => [log, ...prev].slice(0, 10)); // Guardar los últimos 10
        });

        return () => { socket.close(); };
    }, []);

    useEffect(() => {
        void fetchData(activeTab);
        const interval = setInterval(() => {
            void fetchData(activeTab);
            // Si no está conectado, mantener sincronizado el QR
            if (status !== 'connected') {
                fetch(`${API_BASE}/whatsapp/status`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.state) setStatus(data.state);
                        if (data?.qr) setQr(data.qr);
                    })
                    .catch(() => null);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [activeTab, fetchData, status]);

    const handleCleanUploads = async () => {
        if (!confirm('¿Deseas limpiar archivos temporales no utilizados?')) return;
        await fetch(`${API_BASE}/system/clean-uploads`, { method: 'DELETE' });
        alert('Limpieza completada.');
    };

    const handleSendMass = async (contacts: string, message: string, media: File[] | File | null, channel: string = 'whatsapp') => {
        setIsLoading(true);
        setUploadProgress(0);
        try {
            const contactList = parseContactList(contacts);
            const formData = new FormData();
            formData.append('contacts', JSON.stringify(contactList));
            formData.append('message', message);
            formData.append('channel', channel);
            if (media) {
                if (Array.isArray(media)) {
                    media.forEach(f => formData.append('media', f));
                } else {
                    formData.append('media', media);
                }
            }

            const res = await axios.post(`${API_BASE}/send-mass`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    }
                }
            });

            if (res.data?.success) {
                setUploadProgress(100);
                setTimeout(() => setUploadProgress(null), 1000);
            } else {
                alert(`❌ Error: ${res.data?.error || 'No se pudo iniciar la campaña.'}`);
                setUploadProgress(null);
            }
        } catch (e: any) {
            alert(`❌ Error al procesar el envío: ${e.response?.data?.error || e.message}`);
            setUploadProgress(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelMass = async () => {
        try {
            const res = await axios.post(`${API_BASE}/send-mass/cancel`);
            if (res.data?.success) {
                setDiffusionProgress(null);
                setDiffusionLogs([]);
            }
        } catch (e) {
            alert('❌ Error al cancelar.');
        }
    };

    const handleAIGeneration = async (text: string, mode: 'standard' | 'spintax' = 'standard') => {
        try {
            const res = await fetch(`${API_BASE}/ai/review-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, mode })
            });
            const data = await res.json();
            return data.success ? data.corrected : null;
        } catch (e) {
            return null;
        }
    };

    const handleAddReminder = async (chatId: string, text: string, time: string, media: File[] | File | null, repeat?: string, repeatInterval?: number, repeatUnit?: string, title?: string, mediaPath?: string, mediaType?: string, channel?: string) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('chatId', chatId);
            formData.append('text', text);
            formData.append('time', time);
            if (title) formData.append('title', title);
            if (media) {
                if (Array.isArray(media)) {
                    media.forEach(f => formData.append('media', f));
                } else {
                    formData.append('media', media);
                }
            }
            if (repeat) formData.append('repeat', repeat);
            if (repeatInterval) formData.append('repeatInterval', repeatInterval.toString());
            if (repeatUnit) formData.append('repeatUnit', repeatUnit);
            if (mediaPath) formData.append('mediaPath', mediaPath);
            if (mediaType) formData.append('mediaType', mediaType);
            if (channel) formData.append('channel', channel);

            const url = media ? `${API_BASE}/reminders/with-media` : `${API_BASE}/reminders`;
            const res = await fetch(url, {
                method: 'POST',
                body: media ? formData : JSON.stringify({ chatId, text, time, repeat, repeatInterval, repeatUnit, title, mediaPath, mediaType, channel }),
                headers: media ? {} : { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                void fetchData(activeTab);
                // Si viene de una importación masiva (mediaPath), no mostramos alerta individual para no saturar
                if (!mediaPath) alert('✅ Recordatorio programado.');
            }
        } catch (e) {
            alert('❌ Error al programar.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRemindersBulk = async (items: Array<{
        chatId: string;
        text: string;
        time: string;
        mediaPath?: string;
        mediaType?: string;
        repeat?: string;
        repeatInterval?: number;
        repeatUnit?: string;
        title?: string;
        channel?: string;
    }>): Promise<boolean> => {
        if (!items || items.length === 0) return false;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/reminders/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await fetchData(activeTab);
                return true;
            } else {
                alert(`❌ Error al crear recordatorios: ${data.error || 'Desconocido'}`);
                return false;
            }
        } catch (e: any) {
            alert(`❌ Error de conexión al crear recordatorios masivos: ${e.message}`);
            return false;
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
            setSettings(prev => ({ ...prev, ...newSettings }));
            if (newSettings.ALLOWED_GROUPS !== undefined) {
                setAllowedGroups(newSettings.ALLOWED_GROUPS.split(',').map((id: string) => id.trim()).filter(Boolean));
            }
            alert('✅ Configuración guardada.');
        }
    };

    const handleToggleGroup = async (jid: string) => {
        const isAllowed = allowedGroups.includes(jid);
        let newAllowed: string[];
        if (isAllowed) {
            newAllowed = allowedGroups.filter(id => id !== jid);
        } else {
            newAllowed = [...allowedGroups, jid];
        }

        const newSettings = { ALLOWED_GROUPS: newAllowed.join(',') };
        await handleUpdateSettings(newSettings);
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

    const handleResetWhatsApp = async () => {
        if (!confirm('⚠️ ¿Estás seguro de que quieres cerrar la sesión de WhatsApp? Tendrás que escanear el código QR de nuevo o generar un nuevo código.')) return;
        try {
            const res = await fetch(`${API_BASE}/system/reset-whatsapp`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('✅ Sesión cerrada. Por favor, vuelve a la pestaña de inicio para conectar de nuevo.');
                window.location.reload();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (e) {
            alert('❌ Error al intentar cerrar sesión.');
        }
    };

    const handleRequestPairingCode = async (phoneNumber: string) => {
        setIsLoading(true);
        setPairingCode(null);
        try {
            const res = await fetch(`${API_BASE}/whatsapp/pairing-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber })
            });
            const data = await res.json();
            if (data.success) {
                setPairingCode(data.code);
                return data.code;
            } else {
                alert(`❌ Error: ${data.error}`);
                return null;
            }
        } catch (e: any) {
            alert(`❌ Error al solicitar código: ${e.message}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        status,
        qr,
        pairingCode,
        activeTab,
        setActiveTab,
        audits,
        reminders,
        templates,
        autoresponders,
        groups,
        allowedGroups,
        settings,
        prefillDate,
        setPrefillDate,
        prefillReminderId,
        setPrefillReminderId,
        isLoading,
        fetchData,
        handleCleanUploads,
        handleSendMass,
        handleAIGeneration,
        handleAddReminder,
        handleAddRemindersBulk,
        handleDeleteReminder,
        handleUpdateSettings,
        handleToggleGroup,
        handleParseEnv,
        handleCancelMass,
        handleResetWhatsApp,
        handleRequestPairingCode,
        uploadProgress,
        diffusionProgress,
        diffusionLogs,
        networkStatus
    };
}
