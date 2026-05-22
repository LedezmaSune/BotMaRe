'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { AutorespondersPanel } from '@/components/autoresponders/AutorespondersPanel';

export default function AutorespondersPage() {
    const { autoresponders, fetchData } = useGlobalBotData();
 
    return (
        <AutorespondersPanel 
            autoresponders={autoresponders} 
            onRefresh={() => fetchData('autoresponders')} 
        />
    );
}
