export interface CRMContact {
    id: string; // WhatsApp ID o Teléfono limpio (ej: 5219991234567)
    name: string;
    pushName?: string;
    phone?: string;
    tags: string[];
    notes?: string;
    email?: string;
    address?: string;
    customFields?: Record<string, string>;
    lastInteraction: number;
    firstInteraction?: number;
    messageCount: number;
    isGroup?: boolean;
}

export interface CRMTag {
    id: string;
    name: string;
    color: string; // Hex color o clase
    bgClass?: string;
    textClass?: string;
    borderClass?: string;
}

export interface CRMStats {
    total: number;
    vipCount: number;
    leadCount: number;
    clientCount: number;
    debtorCount: number;
    activeToday: number;
}

export interface CRMDatabase {
    contacts: Record<string, CRMContact>;
    tags: CRMTag[];
}

export const DEFAULT_TAGS: CRMTag[] = [
    { id: 'vip', name: 'VIP', color: '#f59e0b', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
    { id: 'lead', name: 'Lead / Prospecto', color: '#10b981', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
    { id: 'cliente', name: 'Cliente Frecuente', color: '#3b82f6', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' },
    { id: 'deudor', name: 'Cobranza / Deudor', color: '#ef4444', bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
    { id: 'soporte', name: 'Soporte Técnico', color: '#a855f7', bgClass: 'bg-purple-500/10', textClass: 'text-purple-400', borderClass: 'border-purple-500/30' },
    { id: 'mayorista', name: 'Mayorista', color: '#06b6d4', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400', borderClass: 'border-cyan-500/30' }
];
