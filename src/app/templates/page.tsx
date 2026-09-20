'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Templates } from '@/components/Templates';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function TemplatesPage() {
    const { templates, fetchData, handleAIGeneration } = useGlobalBotData();

    return (
        <ModuleGuard moduleId="templates" moduleName="Plantillas">
            <Templates 
                templates={templates} 
                onRefresh={() => void fetchData('templates')} 
                onReview={handleAIGeneration}
            />
        </ModuleGuard>
    );
}
