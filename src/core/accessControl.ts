import fs from 'fs';
import path from 'path';

interface AccessList {
    mode: 'all' | 'whitelist' | 'blacklist' | 'none';
    whitelist: string[];
    blacklist: string[];
}

interface AccessConfig {
    contacts: AccessList;
    groups: AccessList;
}

const DEFAULT_CONFIG: AccessConfig = {
    contacts: { mode: 'all', whitelist: [], blacklist: [] },
    groups: { mode: 'all', whitelist: [], blacklist: [] }
};

class AccessControlService {
    private configPath = path.join(process.cwd(), 'data', 'accessList.json');
    private config: AccessConfig;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): AccessConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data) as AccessConfig;
            }
        } catch (error) {
            console.error('[AccessControl] Error loading config:', error);
        }
        this.saveConfig(DEFAULT_CONFIG);
        return { ...DEFAULT_CONFIG };
    }

    private saveConfig(newConfig: AccessConfig) {
        try {
            // Ensure data directory exists
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2), 'utf8');
            this.config = newConfig;
        } catch (error) {
            console.error('[AccessControl] Error saving config:', error);
        }
    }

    /**
     * Valida si el bot puede responder a un ID (usuario o grupo)
     */
    public canReplyTo(id: string, isGroup: boolean = false): boolean {
        const list = isGroup ? this.config.groups : this.config.contacts;
        
        if (list.mode === 'all') return true;
        if (list.mode === 'none') return false;
        
        if (list.mode === 'whitelist') {
            return list.whitelist.includes(id);
        }
        
        if (list.mode === 'blacklist') {
            return !list.blacklist.includes(id);
        }
        
        return true;
    }

    /**
     * Comandos de administración (ej. add, ban, mode)
     */
    public processAdminCommand(commandText: string, isGroupContext: boolean = false): string {
        const args = commandText.trim().split(/\s+/);
        if (args.length < 2) {
            return "❌ Formato incorrecto. Usa: !lista [add|ban|remove|mode] [valor]";
        }

        const action = args[1].toLowerCase(); // add, ban, remove, mode
        const target = args[2]; // numero, id, o "all"/"whitelist"/"blacklist"

        const targetList = isGroupContext ? this.config.groups : this.config.contacts;
        const listName = isGroupContext ? "Grupos" : "Contactos";

        if (action === 'mode') {
            if (['all', 'whitelist', 'blacklist', 'none'].includes(target)) {
                targetList.mode = target as any;
                this.saveConfig(this.config);
                return `✅ Modo de ${listName} cambiado a: ${target}`;
            }
            return "❌ Modo no válido. Usa: all, whitelist, blacklist, none";
        }

        if (!target) return "❌ Faltó proporcionar el ID/Número objetivo.";

        // Normalizamos el ID un poco quitando el @ si lo pusieron
        const cleanTarget = target.replace('@', '');

        if (action === 'add') { // Whitelist
            if (!targetList.whitelist.includes(cleanTarget)) {
                targetList.whitelist.push(cleanTarget);
            }
            // Asegurar que no esté en blacklist
            targetList.blacklist = targetList.blacklist.filter(id => id !== cleanTarget);
            this.saveConfig(this.config);
            return `✅ ID ${cleanTarget} agregado a la Lista Blanca de ${listName}.`;
        }

        if (action === 'ban') { // Blacklist
            if (!targetList.blacklist.includes(cleanTarget)) {
                targetList.blacklist.push(cleanTarget);
            }
            // Asegurar que no esté en whitelist
            targetList.whitelist = targetList.whitelist.filter(id => id !== cleanTarget);
            this.saveConfig(this.config);
            return `🚫 ID ${cleanTarget} agregado a la Lista Negra de ${listName}.`;
        }

        if (action === 'remove') {
            targetList.whitelist = targetList.whitelist.filter(id => id !== cleanTarget);
            targetList.blacklist = targetList.blacklist.filter(id => id !== cleanTarget);
            this.saveConfig(this.config);
            return `🗑️ ID ${cleanTarget} removido de todas las listas de ${listName}.`;
        }

        return "❌ Acción no reconocida. Usa: add, ban, remove, mode";
    }

    public getConfig(): AccessConfig {
        return this.config;
    }
}

export const accessControl = new AccessControlService();
