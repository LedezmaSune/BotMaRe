import fs from 'fs';
import path from 'path';

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

const DEFAULT_DB: CRMDatabase = {
    contacts: {},
    tags: DEFAULT_TAGS
};

export class CRMService {
    private static instance: CRMService;
    private dbPath = path.join(process.cwd(), 'data', 'crm.json');
    private db: CRMDatabase;

    private constructor() {
        this.db = this.loadDB();
    }

    public static getInstance(): CRMService {
        if (!CRMService.instance) {
            CRMService.instance = new CRMService();
        }
        return CRMService.instance;
    }

    private loadDB(): CRMDatabase {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                const parsed = JSON.parse(data) as CRMDatabase;
                return {
                    contacts: parsed.contacts || {},
                    tags: parsed.tags && parsed.tags.length > 0 ? parsed.tags : DEFAULT_TAGS
                };
            }
        } catch (err) {
            console.error('[CRM] Error loading CRM database:', err);
        }
        this.saveDB(DEFAULT_DB);
        return { ...DEFAULT_DB };
    }

    private saveDB(data: CRMDatabase = this.db) {
        try {
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
            this.db = data;
        } catch (err) {
            console.error('[CRM] Error saving CRM database:', err);
        }
    }

    /**
     * Registra o actualiza automáticamente a un contacto en tiempo real cuando envía un mensaje
     */
    public autoTrackContact(id: string, pushName: string = '', isGroup: boolean = false) {
        const cleanId = id.replace(/@.+/, '').trim();
        if (!cleanId) return;

        const existing = this.db.contacts[cleanId];
        const now = Date.now();

        if (existing) {
            existing.lastInteraction = now;
            existing.messageCount = (existing.messageCount || 0) + 1;
            if (pushName && (!existing.name || existing.name === cleanId)) {
                existing.name = pushName;
            }
            if (pushName) {
                existing.pushName = pushName;
            }
            existing.isGroup = isGroup;
        } else {
            this.db.contacts[cleanId] = {
                id: cleanId,
                name: pushName || cleanId,
                pushName: pushName,
                phone: cleanId,
                tags: ['lead'],
                notes: '',
                firstInteraction: now,
                lastInteraction: now,
                messageCount: 1,
                isGroup
            };
        }

        this.saveDB();
    }

    public getContact(id: string): CRMContact | undefined {
        const cleanId = id.replace(/@.+/, '').trim();
        return this.db.contacts[cleanId];
    }

    public getAllContacts(): CRMContact[] {
        return Object.values(this.db.contacts).sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0));
    }

    public updateContact(id: string, updates: Partial<CRMContact>) {
        const cleanId = id.replace(/@.+/, '').trim();
        const existing = this.db.contacts[cleanId];
        const now = Date.now();

        if (!existing) {
            this.db.contacts[cleanId] = {
                id: cleanId,
                name: updates.name || cleanId,
                pushName: updates.pushName,
                phone: cleanId,
                tags: updates.tags || ['lead'],
                notes: updates.notes || '',
                email: updates.email || '',
                address: updates.address || '',
                customFields: updates.customFields || {},
                firstInteraction: now,
                lastInteraction: now,
                messageCount: 1,
                isGroup: updates.isGroup || false
            };
        } else {
            this.db.contacts[cleanId] = {
                ...existing,
                ...updates,
                id: cleanId
            };
        }

        this.saveDB();
        return this.db.contacts[cleanId];
    }

    public deleteContact(id: string) {
        const cleanId = id.replace(/@.+/, '').trim();
        if (this.db.contacts[cleanId]) {
            delete this.db.contacts[cleanId];
            this.saveDB();
        }
    }

    public addTag(id: string, tag: string) {
        const cleanId = id.replace(/@.+/, '').trim();
        const contact = this.db.contacts[cleanId];
        if (contact) {
            if (!contact.tags) contact.tags = [];
            if (!contact.tags.includes(tag)) {
                contact.tags.push(tag);
                this.saveDB();
            }
        } else {
            this.updateContact(cleanId, { tags: [tag] });
        }
    }

    public removeTag(id: string, tag: string) {
        const cleanId = id.replace(/@.+/, '').trim();
        const contact = this.db.contacts[cleanId];
        if (contact && contact.tags) {
            contact.tags = contact.tags.filter(t => t !== tag);
            this.saveDB();
        }
    }

    public getContactsByTag(tag: string): CRMContact[] {
        return Object.values(this.db.contacts).filter(c => c.tags && c.tags.includes(tag));
    }

    public getAllTags(): CRMTag[] {
        return this.db.tags || DEFAULT_TAGS;
    }

    public createTag(name: string, color: string): CRMTag {
        const id = name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
        const existing = this.db.tags.find(t => t.id === id || t.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            existing.name = name;
            existing.color = color;
            this.saveDB();
            return existing;
        }

        const newTag: CRMTag = {
            id,
            name,
            color: color || '#8b5cf6',
            bgClass: 'bg-purple-500/10',
            textClass: 'text-purple-400',
            borderClass: 'border-purple-500/30'
        };

        this.db.tags.push(newTag);
        this.saveDB();
        return newTag;
    }

    public updateTag(tagId: string, updates: { name?: string, color?: string }): CRMTag | null {
        const tag = this.db.tags.find(t => t.id === tagId);
        if (!tag) return null;

        if (updates.name) tag.name = updates.name.trim();
        if (updates.color) tag.color = updates.color.trim();

        this.saveDB();
        return tag;
    }

    public deleteTag(tagId: string) {
        this.db.tags = this.db.tags.filter(t => t.id !== tagId && t.name !== tagId);
        // Quitar la etiqueta de los contactos que la tengan
        for (const contact of Object.values(this.db.contacts)) {
            if (contact.tags) {
                contact.tags = contact.tags.filter(t => t !== tagId);
            }
        }
        this.saveDB();
    }

    public bulkTag(ids: string[], tag: string) {
        ids.forEach(id => {
            const cleanId = id.replace(/@.+/, '').trim();
            const contact = this.db.contacts[cleanId];
            if (contact) {
                if (!contact.tags) contact.tags = [];
                if (!contact.tags.includes(tag)) contact.tags.push(tag);
            }
        });
        this.saveDB();
    }

    public bulkUntag(ids: string[], tag: string) {
        ids.forEach(id => {
            const cleanId = id.replace(/@.+/, '').trim();
            const contact = this.db.contacts[cleanId];
            if (contact && contact.tags) {
                contact.tags = contact.tags.filter(t => t !== tag);
            }
        });
        this.saveDB();
    }

    public bulkDelete(ids: string[]) {
        ids.forEach(id => {
            const cleanId = id.replace(/@.+/, '').trim();
            delete this.db.contacts[cleanId];
        });
        this.saveDB();
    }

    public importContacts(contacts: Partial<CRMContact>[]): number {
        let imported = 0;
        const now = Date.now();

        contacts.forEach(c => {
            if (!c.id && !c.phone) return;
            const cleanId = String(c.id || c.phone).replace(/@.+/, '').replace(/[^0-9]/g, '');
            if (!cleanId) return;

            const existing = this.db.contacts[cleanId];
            if (existing) {
                if (c.name) existing.name = c.name;
                if (c.email) existing.email = c.email;
                if (c.notes) existing.notes = c.notes;
                if (c.tags && Array.isArray(c.tags)) {
                    existing.tags = Array.from(new Set([...existing.tags, ...c.tags]));
                }
            } else {
                this.db.contacts[cleanId] = {
                    id: cleanId,
                    name: c.name || cleanId,
                    pushName: c.pushName || c.name || '',
                    phone: cleanId,
                    tags: c.tags && Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : ['lead'],
                    notes: c.notes || '',
                    email: c.email || '',
                    address: c.address || '',
                    customFields: c.customFields || {},
                    firstInteraction: now,
                    lastInteraction: now,
                    messageCount: 0,
                    isGroup: c.isGroup || false
                };
            }
            imported++;
        });

        this.saveDB();
        return imported;
    }

    public getStats() {
        const contacts = Object.values(this.db.contacts);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        return {
            total: contacts.length,
            vipCount: contacts.filter(c => c.tags && c.tags.includes('vip')).length,
            leadCount: contacts.filter(c => c.tags && c.tags.includes('lead')).length,
            clientCount: contacts.filter(c => c.tags && c.tags.includes('cliente')).length,
            debtorCount: contacts.filter(c => c.tags && c.tags.includes('deudor')).length,
            activeToday: contacts.filter(c => (c.lastInteraction || 0) >= oneDayAgo).length
        };
    }
}

export const crmService = CRMService.getInstance();
