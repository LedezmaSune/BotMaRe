'use client';

import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { playNotificationSound } from '../utils/audioNotification';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
    source?: string;
    link?: string;
    read?: boolean;
}

const STORAGE_KEY = 'botmare_notifications_v1';
const SOUND_KEY = 'botmare_notif_sound_enabled';

export function useNotifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [toasts, setToasts] = useState<NotificationItem[]>([]);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>('default');

    // Cargar historial y preferencias desde localStorage y API
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Cargar preferencia de sonido
        const savedSound = localStorage.getItem(SOUND_KEY);
        if (savedSound !== null) {
            setSoundEnabled(savedSound === 'true');
        }

        // Cargar estado de permisos del navegador
        if ('Notification' in window) {
            setDesktopPermission(Notification.permission);
        }

        // Cargar del localStorage local
        try {
            const savedNotifs = localStorage.getItem(STORAGE_KEY);
            if (savedNotifs) {
                setNotifications(JSON.parse(savedNotifs));
            }
        } catch (e) {}

        // Sincronizar con el servidor
        fetch('/api/system/notifications')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.notifications && Array.isArray(data.notifications)) {
                    setNotifications(prev => {
                        const existingIds = new Set(prev.map(n => n.id));
                        const incoming = data.notifications.filter((n: NotificationItem) => !existingIds.has(n.id));
                        const merged = [...incoming, ...prev].slice(0, 60);
                        try {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                        } catch (e) {}
                        return merged;
                    });
                }
            })
            .catch(() => null);
    }, []);

    // Guardar cambios en localStorage
    const saveNotifications = useCallback((items: NotificationItem[]) => {
        setNotifications(items);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 60)));
            } catch (e) {}
        }
    }, []);

    // Conectar WebSocket para recibir notificaciones en tiempo real
    useEffect(() => {
        const socket = io();

        socket.on('system_notification', (notif: NotificationItem) => {
            // 1. Agregar a lista principal
            setNotifications(prev => {
                const next = [notif, ...prev.filter(n => n.id !== notif.id)].slice(0, 60);
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                } catch (e) {}
                return next;
            });

            // 2. Agregar a Toasts flotantes en pantalla
            setToasts(prev => [notif, ...prev].slice(0, 4));

            // 3. Reproducir sonido si está habilitado
            if (soundEnabled) {
                playNotificationSound(notif.type);
            }

            // 4. Notificación de Escritorio de Windows / Navegador
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(notif.title, {
                        body: notif.message,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        tag: notif.id
                    });
                } catch (e) {}
            }
        });

        return () => {
            socket.close();
        };
    }, [soundEnabled]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const markAsRead = useCallback((id: string) => {
        saveNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    }, [notifications, saveNotifications]);

    const markAllAsRead = useCallback(() => {
        saveNotifications(notifications.map(n => ({ ...n, read: true })));
    }, [notifications, saveNotifications]);

    const clearAll = useCallback(async () => {
        saveNotifications([]);
        try {
            await fetch('/api/system/notifications', { method: 'DELETE' });
        } catch (e) {}
    }, [saveNotifications]);

    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem(SOUND_KEY, String(next));
            }
            if (next) playNotificationSound('info');
            return next;
        });
    }, []);

    const requestDesktopPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        try {
            const permission = await Notification.requestPermission();
            setDesktopPermission(permission);
            if (permission === 'granted') {
                new Notification('🔔 Notificaciones Activadas', {
                    body: 'Ahora recibirás avisos del BotMaRe incluso con la ventana en segundo plano.',
                    icon: '/icon-192.png'
                });
            }
        } catch (e) {}
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        toasts,
        removeToast,
        markAsRead,
        markAllAsRead,
        clearAll,
        soundEnabled,
        toggleSound,
        desktopPermission,
        requestDesktopPermission
    };
}
