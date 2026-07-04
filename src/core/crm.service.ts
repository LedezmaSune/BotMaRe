import fs from 'fs';
import path from 'path';

export interface CRMContact {
    id: string; // WhatsApp ID
    name: string;
    tags: string[];
    notes?: string;
    lastInteraction?: number;
}

export interface CRMDatabase {
    contacts: Record<string, CRMContact>;
}

const DEFAULT_DB: CRMDatabase = {
    contacts: {}
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
                return JSON.parse(data) as CRMDatabase;
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
        } catch (err) {
            console.error('[CRM] Error saving CRM database:', err);
        }
    }

    public getContact(id: string): CRMContact | undefined {
        return this.db.contacts[id];
    }

    public getAllContacts(): CRMContact[] {
        return Object.values(this.db.contacts);
    }

    public updateContact(id: string, updates: Partial<CRMContact>) {
        if (!this.db.contacts[id]) {
            this.db.contacts[id] = { id, name: updates.name || id, tags: [], lastInteraction: Date.now() };
        }
        this.db.contacts[id] = { ...this.db.contacts[id], ...updates };
        this.saveDB();
    }

    public deleteContact(id: string) {
        if (this.db.contacts[id]) {
            delete this.db.contacts[id];
            this.saveDB();
        }
    }

    public addTag(id: string, tag: string) {
        const contact = this.db.contacts[id];
        if (contact) {
            if (!contact.tags.includes(tag)) {
                contact.tags.push(tag);
                this.saveDB();
            }
        } else {
            this.updateContact(id, { tags: [tag] });
        }
    }

    public removeTag(id: string, tag: string) {
        const contact = this.db.contacts[id];
        if (contact) {
            contact.tags = contact.tags.filter(t => t !== tag);
            this.saveDB();
        }
    }

    public getContactsByTag(tag: string): CRMContact[] {
        return Object.values(this.db.contacts).filter(c => c.tags.includes(tag));
    }
}

export const crmService = CRMService.getInstance();
