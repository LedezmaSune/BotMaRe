'use client';

import CRMUI from '@/components/CRMUI';
import React from 'react';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function CRMPage() {
    return (
        <ModuleGuard moduleId="crm" moduleName="CRM y Etiquetas">
            <CRMUI />
        </ModuleGuard>
    );
}
