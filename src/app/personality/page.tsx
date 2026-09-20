'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Personality } from '@/components/Personality';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function PersonalityPage() {
    const { settings, handleUpdateSettings } = useGlobalBotData();

    return (
        <ModuleGuard moduleId="personality" moduleName="Cerebro IA">
            {!settings ? (
                <div className="p-8 text-center animate-pulse">Cargando Cerebro...</div>
            ) : (
                <Personality initialSettings={settings} onUpdate={handleUpdateSettings} />
            )}
        </ModuleGuard>
    );
}
