'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// For socket.io, omitting the URL will connect back to the same host/port the page was served from.
const SOCKET_URL = ''; 

export function useWhatsApp() {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [qr, setQr] = useState<string | null>(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket']
        });

        newSocket.on('status', (newStatus) => {
            setStatus(newStatus);
            if (newStatus === 'connected') setQr(null);
        });

        newSocket.on('qr', (newQr) => {
            setQr(newQr);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const sendMessage = async (to: string, message: string) => {
        try {
            const response = await fetch(`${SOCKET_URL}/api/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message }),
            });
            return await response.json();
        } catch {
            return { success: false, error: 'Failed to connect to server' };
        }
    };

    return { status, qr, sendMessage };
}
