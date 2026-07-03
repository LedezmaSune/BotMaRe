import AccessControlUI from '@/components/AccessControlUI';
import React from 'react';
import { Shield } from 'lucide-react';

export const metadata = {
    title: 'Listas de Acceso | BotMaRe',
};

export default function AccessPage() {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    Listas de Acceso (Whitelist/Blacklist)
                </h1>
                <p className="text-slate-400 mt-2">
                    Controla a quién le responde el bot y en qué grupos puede participar.
                </p>
            </header>

            <main className="flex-1 min-h-0">
                <AccessControlUI />
            </main>
        </div>
    );
}
