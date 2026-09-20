'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { AuditLogs } from '@/components/AuditLogs';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function AuditsPage() {
    const { audits } = useGlobalBotData();

    return (
        <ModuleGuard moduleId="audits" moduleName="Auditoría">
            <AuditLogs audits={audits} />
        </ModuleGuard>
    );
}
