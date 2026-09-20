'use client';

import { SupportDashboard } from '@/components/SupportDashboard';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function SupportPage() {
    return (
        <ModuleGuard moduleId="support" moduleName="Soporte">
            <SupportDashboard />
        </ModuleGuard>
    );
}
