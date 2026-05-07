'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Groups } from '@/components/Groups';

export default function GroupsPage() {
    const { groups, fetchData } = useGlobalBotData();

    return (
        <Groups 
            groups={groups} 
            onRefresh={() => void fetchData('groups')} 
        />
    );
}
