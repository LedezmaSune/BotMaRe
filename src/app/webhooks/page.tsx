import WebhooksUI from '@/components/WebhooksUI';
import React from 'react';

export const metadata = {
    title: 'Webhooks | BotMaRe',
};

export default function WebhooksPage() {
    const apiKey = process.env.WEBHOOK_API_KEY || 'LLAVE_NO_CONFIGURADA';
    return <WebhooksUI apiKey={apiKey} />;
}
