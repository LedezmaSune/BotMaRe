'use client';

import { UpdateCenter } from '@/components/UpdateCenter';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function UpdatesPage() {
    return (
        <ModuleGuard moduleId="updates" moduleName="Actualizaciones">
            <UpdateCenter />
        </ModuleGuard>
    );
}
