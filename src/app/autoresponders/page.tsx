'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { AutorespondersPanel } from '@/components/autoresponders/AutorespondersPanel';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function AutorespondersPage() {
    const { autoresponders, fetchData } = useGlobalBotData();
 
    return (
        <ModuleGuard moduleId="autoresponders" moduleName="Menús Rápidos">
            <AutorespondersPanel 
                autoresponders={autoresponders} 
                onRefresh={() => fetchData('autoresponders')} 
            />
        </ModuleGuard>
    );
}
