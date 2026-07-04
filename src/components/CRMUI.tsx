import React from 'react';
import { Briefcase, Users, Tags, AlertCircle, Phone, Trash2 } from 'lucide-react';

export default function CRMUI() {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-fuchsia-500" />
                    CRM y Etiquetas (BETA)
                </h1>
                <p className="text-slate-400 mt-2">
                    Gestiona tus prospectos, asigna etiquetas como VIP o Deudor y filtra tus campañas masivas.
                </p>
            </header>

            <div className="flex-1 premium-glass p-6 rounded-2xl border border-app-border/30 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-fuchsia-500/10 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-10 h-10 text-fuchsia-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Base de Datos de Clientes</h2>
                <p className="text-slate-400 max-w-md">
                    El sistema está almacenando y perfilando a los clientes en segundo plano a medida que interactúan con el bot. 
                    En una futura actualización, este panel mostrará la tabla completa de contactos.
                </p>
                <div className="mt-8 flex gap-4">
                    <div className="flex items-center gap-2 bg-app-card px-4 py-2 rounded-lg border border-app-border/50">
                        <Tags className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm">Sistema de Tags Activo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
