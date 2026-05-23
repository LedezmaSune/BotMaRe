'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Reminders } from '@/components/Reminders';

export default function SchedulingPage() {
    const { reminders, handleAddReminder, handleDeleteReminder, prefillDate, templates, prefillReminderId, setPrefillReminderId } = useGlobalBotData();

    return (
        <Reminders
            reminders={reminders}
            onAdd={handleAddReminder}
            onDelete={handleDeleteReminder}
            initialTime={prefillDate}
            initialId={prefillReminderId}
            onClearInitialId={() => setPrefillReminderId(null)}
            templates={templates}
        />
    );
}
