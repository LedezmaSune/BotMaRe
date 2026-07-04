import React from 'react';
import { Webhook, Zap, Link as LinkIcon, Server } from 'lucide-react';

export default function WebhooksUI() {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Webhook className="w-8 h-8 text-orange-500" />
                    Webhooks (En Construcción 🚧)
                </h1>
                <p className="text-slate-400 mt-2">
                    Conecta BotMaRe con cientos de aplicaciones externas usando Zapier, Make, n8n y más.
                </p>
            </header>

            <div className="flex-1 premium-glass p-6 rounded-2xl border border-app-border/30 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                    <Zap className="w-10 h-10 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Próximamente...</h2>
                <p className="text-slate-400 max-w-md">
                    Los puertos lógicos de la API ya están abiertos en el sistema central (`/api/webhooks`), 
                    pero requieren que adquieras un dominio público (o sigas usando el túnel) para que servicios 
                    como Zapier puedan enviarle datos de manera estable.
                </p>
                <div className="mt-8 flex gap-4">
                    <div className="flex items-center gap-2 bg-app-card px-4 py-2 rounded-lg border border-app-border/50">
                        <Server className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm">API Endpoint Listo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
