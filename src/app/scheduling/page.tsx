'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Reminders } from '@/components/Reminders';
import { ModuleGuard } from '@/components/ModuleGuard';

export default function SchedulingPage() {
    const { reminders, handleAddReminder, handleAddRemindersBulk, handleDeleteReminder, prefillDate, templates, prefillReminderId, setPrefillReminderId, fetchData } = useGlobalBotData();

    return (
        <ModuleGuard moduleId="scheduling" moduleName="Recordatorios">
            <Reminders
                reminders={reminders}
                onAdd={handleAddReminder}
                onAddBulk={handleAddRemindersBulk}
                onDelete={handleDeleteReminder}
                initialTime={prefillDate}
                initialId={prefillReminderId}
                onClearInitialId={() => setPrefillReminderId(null)}
                templates={templates}
                onRefresh={() => fetchData('scheduling')}
            />
        </ModuleGuard>
    );
}
