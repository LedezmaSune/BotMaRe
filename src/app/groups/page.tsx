'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Groups } from '@/components/Groups';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function GroupsPage() {
    const { groups, allowedGroups, handleToggleGroup, fetchData } = useGlobalBotData();

    return (
        <ModuleGuard moduleId="groups" moduleName="Grupos">
            <Groups 
                groups={groups} 
                allowedGroups={allowedGroups}
                onToggle={handleToggleGroup}
                onRefresh={() => void fetchData('groups')} 
            />
        </ModuleGuard>
    );
}
