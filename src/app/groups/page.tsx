'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Groups } from '@/components/Groups';

export default function GroupsPage() {
    const { groups, allowedGroups, handleToggleGroup, fetchData } = useGlobalBotData();

    return (
        <Groups 
            groups={groups} 
            allowedGroups={allowedGroups}
            onToggle={handleToggleGroup}
            onRefresh={() => void fetchData('groups')} 
        />
    );
}
