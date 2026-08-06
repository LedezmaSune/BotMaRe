import fs from 'fs';
import path from 'path';
import vm from 'vm';
import axios from 'axios';
import { globalEvents, EVENTS } from "../../core/events";
import { MessageService } from "../messages/message.service";

export interface PluginMetadata {
    id: string;
    name: string;
    description: string;
    active: boolean;
    code: string;
    error?: string;
}

export class PluginService {
    private pluginsDir: string;
    private plugins: Map<string, any>;
    private metadata: Map<string, PluginMetadata>;
    private waService: MessageService | null = null;
    private static instance: PluginService;

    private constructor() {
        this.pluginsDir = path.resolve(process.cwd(), 'data/plugins');
        this.plugins = new Map();
        this.metadata = new Map();

        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
    }

    public static getInstance(): PluginService {
        if (!PluginService.instance) {
            PluginService.instance = new PluginService();
        }
        return PluginService.instance;
    }

    public init(waService: MessageService) {
        this.waService = waService;
        this.loadPlugins();
        
        // Listen to global messages to dispatch them to plugins
        globalEvents.on(EVENTS.MESSAGE_RECEIVED, async (data: any) => {
            const { message, number, isGroup, pushName, quoted } = data;
            await this.dispatchOnMessage({
                text: message,
                from: number,
                isGroup,
                pushName,
                quoted
            });
        });
        
        console.log(`[PluginService] Inicializado con ${this.plugins.size} plugins activos.`);
    }

    public loadPlugins() {
        this.plugins.clear();
        this.metadata.clear();
        
        if (!fs.existsSync(this.pluginsDir)) return;

        const files = fs.readdirSync(this.pluginsDir).filter(f => f.endsWith('.js'));

        for (const file of files) {
            this.loadSinglePlugin(file);
        }
    }

    private loadSinglePlugin(filename: string) {
        const id = filename.replace('.js', '');
        const fullPath = path.join(this.pluginsDir, filename);
        const code = fs.readFileSync(fullPath, 'utf8');

        const meta: PluginMetadata = {
            id,
            name: id,
            description: "Sin descripción",
            active: true,
            code: code
        };

        try {
            // Create a safe sandbox
            const sandbox: any = {
                console: {
                    log: (...args: any[]) => console.log(`[Plugin:${id}]`, ...args),
                    error: (...args: any[]) => console.error(`[Plugin:${id}]`, ...args),
                    warn: (...args: any[]) => console.warn(`[Plugin:${id}]`, ...args)
                },
                setTimeout,
                clearTimeout,
                axios: axios,
                module: { exports: {} },
                exports: {}
            };

            const context = vm.createContext(sandbox);
            const script = new vm.Script(code);
            script.runInContext(context, { timeout: 1000 }); // 1 sec timeout for infinite loops

            const exported = sandbox.module.exports || sandbox.exports;
            
            if (exported.name) meta.name = exported.name;
            if (exported.description) meta.description = exported.description;
            if (exported.active !== undefined) meta.active = exported.active;

            if (meta.active && typeof exported.onMessage === 'function') {
                this.plugins.set(id, exported);
            }
            
            this.metadata.set(id, meta);
        } catch (error: any) {
            meta.error = error.message;
            meta.active = false;
            this.metadata.set(id, meta);
            console.error(`[PluginService] Error cargando plugin ${filename}:`, error.message);
        }
    }

    public getPlugins(): PluginMetadata[] {
        return Array.from(this.metadata.values());
    }

    public togglePlugin(id: string, active: boolean) {
        const meta = this.metadata.get(id);
        if (!meta) throw new Error("Plugin no encontrado");
        
        let newCode = meta.code;
        if (newCode.includes('active: true') && !active) {
            newCode = newCode.replace('active: true', 'active: false');
        } else if (newCode.includes('active: false') && active) {
            newCode = newCode.replace('active: false', 'active: true');
        } else if (!newCode.includes('active:')) {
            // Inject if missing
            newCode = newCode.replace('module.exports = {', `module.exports = {\n    active: ${active},`);
        }
        
        this.savePlugin(id, newCode);
    }

    public savePlugin(id: string, code: string) {
        const fullPath = path.join(this.pluginsDir, `${id}.js`);
        fs.writeFileSync(fullPath, code, 'utf8');
        this.loadSinglePlugin(`${id}.js`);
    }
    
    public deletePlugin(id: string) {
        const fullPath = path.join(this.pluginsDir, `${id}.js`);
        if(fs.existsSync(fullPath)){
            fs.unlinkSync(fullPath);
        }
        this.plugins.delete(id);
        this.metadata.delete(id);
    }

    public async dispatchOnMessage(ctx: any) {
        if (!this.waService) return;

        // Bridge to interact safely with WhatsApp
        const api = {
            reply: async (text: string) => await this.waService?.sendMessage(ctx.from, text),
            sendTo: async (jid: string, text: string) => await this.waService?.sendMessage(jid, text),
        };

        for (const [id, plugin] of this.plugins.entries()) {
            try {
                if (typeof plugin.onMessage === 'function') {
                    await Promise.resolve(plugin.onMessage(ctx, api)).catch(e => {
                        console.error(`[Plugin:${id}] Runtime error in onMessage:`, e.message);
                    });
                }
            } catch(e) {}
        }
    }
}
