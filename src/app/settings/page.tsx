'use client';

import { useGlobalBotData } from '@/app/BotDataProvider';
import { Settings } from '@/components/Settings';

export default function SettingsPage() {
    const { settings, networkStatus, handleUpdateSettings, handleParseEnv, handleResetWhatsApp } = useGlobalBotData();

    if (!settings) return <div className="p-8 text-center animate-pulse">Cargando Configuración...</div>;

    return (
        <Settings 
            settings={settings} 
            networkStatus={networkStatus}
            onUpdate={handleUpdateSettings} 
            onParseEnv={handleParseEnv} 
            onResetWhatsApp={handleResetWhatsApp}
        />
    );
}
