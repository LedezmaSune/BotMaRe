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

interface MenuState {
    step: 'MAIN_MENU' | 'WAITING_ADD_ID' | 'WAITING_BAN_ID' | 'WAITING_REMOVE_ID';
    isGroup: boolean;
}

const menuStateMap = new Map<string, MenuState>();

export interface Interaction {
    id: string;
    pushName: string;
    timestamp: number;
    isGroup: boolean;
}

class AccessControlService {
    private configPath = path.join(process.cwd(), 'data', 'accessList.json');
    private config: AccessConfig;
    private recentInteractions: Interaction[] = [];

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

    public trackInteraction(id: string, pushName: string, isGroup: boolean) {
        // Remove if exists to place it at the top
        this.recentInteractions = this.recentInteractions.filter(i => i.id !== id);
        this.recentInteractions.unshift({ id, pushName, timestamp: Date.now(), isGroup });
        if (this.recentInteractions.length > 50) {
            this.recentInteractions.pop();
        }
    }

    public getRecentInteractions(): Interaction[] {
        return this.recentInteractions;
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

    public startMenu(userId: string, isGroup: boolean): string {
        menuStateMap.set(userId, { step: 'MAIN_MENU', isGroup });
        const listName = isGroup ? "👥 Grupos" : "👤 Contactos";
        return `🛡️ *MENÚ DE LISTAS DE ACCESO* 🛡️
👉 *Categoría:* ${listName}
━━━━━━━━━━━━━━━━━
*Responde con el número de la opción deseada:*

⚙️ *MODOS GENERALES*
1️⃣ 🟢 *Activar Lista Blanca* (Solo autorizados)
2️⃣ 🔴 *Activar Lista Negra* (Todos menos bloqueados)
3️⃣ 🔓 *Desactivar filtros* (Modo abierto para todos)

📝 *GESTIÓN DE ESTA LISTA*
4️⃣ ✅ *Agregar* un usuario/grupo (Blanca)
5️⃣ 🚫 *Bloquear* un usuario/grupo (Negra)
6️⃣ 🗑️ *Eliminar* de ambas listas

_(💡 Escribe "salir" en cualquier momento para cancelar)_`;
    }

    public handleMenuWizard(userId: string, text: string, isGroup: boolean): string | null {
        const state = menuStateMap.get(userId);
        if (!state) return null; // No está en el menú

        const listName = state.isGroup ? "Grupos" : "Contactos";
        const cleanText = text.trim();

        if (cleanText.toLowerCase() === 'cancelar' || cleanText.toLowerCase() === 'salir') {
            menuStateMap.delete(userId);
            return "❌ Menú cancelado.";
        }

        if (state.step === 'MAIN_MENU') {
            switch (cleanText) {
                case '1':
                    menuStateMap.delete(userId);
                    return this.processAdminCommand(`!lista mode whitelist`, state.isGroup);
                case '2':
                    menuStateMap.delete(userId);
                    return this.processAdminCommand(`!lista mode blacklist`, state.isGroup);
                case '3':
                    menuStateMap.delete(userId);
                    return this.processAdminCommand(`!lista mode all`, state.isGroup);
                case '4':
                    state.step = 'WAITING_ADD_ID';
                    return `🟢 *AGREGAR A LISTA BLANCA*\n\nPor favor, responde a este mensaje enviando el *número de teléfono* (ej. 521551234) o *ID del Grupo* que deseas autorizar en la categoría de ${listName}.\n\n_(❌ Para cancelar escribe "salir")_`;
                case '5':
                    state.step = 'WAITING_BAN_ID';
                    return `🔴 *BLOQUEAR (LISTA NEGRA)*\n\nPor favor, responde a este mensaje enviando el *número de teléfono* o *ID del Grupo* que deseas bloquear en la categoría de ${listName}.\n\n_(❌ Para cancelar escribe "salir")_`;
                case '6':
                    state.step = 'WAITING_REMOVE_ID';
                    return `🗑️ *ELIMINAR DE LAS LISTAS*\n\nPor favor, responde a este mensaje enviando el *número de teléfono* o *ID del Grupo* que deseas eliminar completamente de las listas de ${listName}.\n\n_(❌ Para cancelar escribe "salir")_`;
                default:
                    return "⚠️ Opción no válida. Por favor responde únicamente con un número del *1* al *6*, o escribe *salir*.";
            }
        }

        if (state.step === 'WAITING_ADD_ID') {
            menuStateMap.delete(userId);
            return this.processAdminCommand(`!lista add ${cleanText}`, state.isGroup);
        }

        if (state.step === 'WAITING_BAN_ID') {
            menuStateMap.delete(userId);
            return this.processAdminCommand(`!lista ban ${cleanText}`, state.isGroup);
        }

        if (state.step === 'WAITING_REMOVE_ID') {
            menuStateMap.delete(userId);
            return this.processAdminCommand(`!lista remove ${cleanText}`, state.isGroup);
        }

        menuStateMap.delete(userId);
        return "❌ Estado desconocido. Menú cancelado.";
    }
}

export const accessControl = new AccessControlService();
