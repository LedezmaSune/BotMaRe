'use client';

import WebhooksUI from '@/components/WebhooksUI';
import React from 'react';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function WebhooksPage() {
    const apiKey = 'LLAVE_NO_CONFIGURADA';
    return (
        <ModuleGuard moduleId="webhooks" moduleName="Webhooks">
            <WebhooksUI apiKey={apiKey} />
        </ModuleGuard>
    );
}
