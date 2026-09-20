'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { CalendarView } from '@/components/CalendarView';
import { useRouter } from 'next/navigation';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function CalendarPage() {
    const { reminders, setPrefillDate, setPrefillReminderId, setActiveTab } = useGlobalBotData();
    const router = useRouter();

    return (
        <ModuleGuard moduleId="calendar" moduleName="Calendario">
            <CalendarView 
                reminders={reminders} 
                onDateSelect={(date) => {
                    setPrefillDate(date);
                    setActiveTab('scheduling');
                    router.push('/scheduling');
                }}
                onEventSelect={(id) => {
                    setPrefillReminderId(id);
                    setActiveTab('scheduling');
                    router.push('/scheduling');
                }}
            />
        </ModuleGuard>
    );
}
