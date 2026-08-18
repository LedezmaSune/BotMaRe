import fs from 'fs';
import path from 'path';
import vm from 'vm';
import axios from 'axios';
import { MessageService } from "../messages/message.service";

export interface PluginMetadata {
    id: string;
    name: string;
    description: string;
    active: boolean;
    code: string;
    error?: string;
}

export interface PluginContext {
    text: string;
    from: string;
    sender?: string;
    isGroup?: boolean;
    pushName?: string;
    quoted?: any;
    rawMessage?: any;
    socket?: any;
}

export class PluginService {
    private pluginsDir: string;
    private plugins: Map<string, any>;
    private metadata: Map<string, PluginMetadata>;
    private waService: MessageService | null = null;
    private apiKeysConfig: any = { APIs: {}, APIKeys: {} };
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
        console.log(`[PluginService] Inicializado con ${this.plugins.size} plugins activos.`);
    }

    public loadPlugins() {
        this.plugins.clear();
        this.metadata.clear();
        
        // Cargar configuración global de APIs si existe
        const apiKeysPath = path.resolve(process.cwd(), 'data/api-keys.json');
        if (fs.existsSync(apiKeysPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(apiKeysPath, 'utf8'));
                if (config.APIKeys) {
                    for (const [provider, keys] of Object.entries(config.APIKeys)) {
                        if (Array.isArray(keys) && keys.length > 0) {
                            config.APIKeys[provider] = keys[Math.floor(Math.random() * keys.length)];
                        }
                    }
                }
                this.apiKeysConfig = config;
            } catch (error) {
                console.error('[PluginService] Error cargando api-keys.json:', error);
            }
        }
        
        if (!fs.existsSync(this.pluginsDir)) return;

        const files = fs.readdirSync(this.pluginsDir).filter(f => f.endsWith('.js'));

        for (const file of files) {
            this.loadSinglePlugin(file);
        }
    }

    public loadSinglePlugin(filename: string) {
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
            // Create a safe sandbox with Node standard utilities
            const sandbox: any = {
                console: {
                    log: (...args: any[]) => console.log(`[Plugin:${id}]`, ...args),
                    error: (...args: any[]) => console.error(`[Plugin:${id}]`, ...args),
                    warn: (...args: any[]) => console.warn(`[Plugin:${id}]`, ...args),
                    info: (...args: any[]) => console.info(`[Plugin:${id}]`, ...args)
                },
                setTimeout,
                clearTimeout,
                setInterval,
                clearInterval,
                Buffer,
                URL,
                URLSearchParams,
                encodeURIComponent,
                decodeURIComponent,
                encodeURI,
                decodeURI,
                parseInt,
                parseFloat,
                isNaN,
                isFinite,
                Math,
                Date,
                RegExp,
                Array,
                Object,
                String,
                Number,
                Boolean,
                JSON,
                Promise,
                axios: axios,
                fetch: global.fetch || fetch,
                global: this.apiKeysConfig,
                module: { exports: {} },
                exports: {}
            };

            const context = vm.createContext(sandbox);
            const script = new vm.Script(code);
            script.runInContext(context, { timeout: 3000 }); // 3 sec timeout

            const exported = sandbox.module.exports || sandbox.exports;
            
            if (exported.name) meta.name = exported.name;
            if (exported.description) meta.description = exported.description;
            if (exported.active !== undefined) meta.active = Boolean(exported.active);

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
        if (/active\s*:\s*(true|false)/i.test(newCode)) {
            newCode = newCode.replace(/active\s*:\s*(true|false)/i, `active: ${active}`);
        } else if (/(module\.)?exports\s*=\s*\{/i.test(newCode)) {
            newCode = newCode.replace(/(module\.)?exports\s*=\s*\{/i, `module.exports = {\n    active: ${active},`);
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

    public async dispatchOnMessage(ctx: PluginContext): Promise<boolean> {
        if (!this.waService || !ctx || !ctx.text) return false;

        let handled = false;

        // Bridge to interact safely with WhatsApp
        const api = {
            reply: async (text: string) => {
                handled = true;
                return await this.waService?.sendMessage(ctx.from, text);
            },
            sendTo: async (jid: string, text: string) => {
                handled = true;
                return await this.waService?.sendMessage(jid, text);
            },
            sendMedia: async (urlOrPath: string, caption?: string, mediaType: 'image' | 'document' | 'video' | 'audio' = 'image') => {
                handled = true;
                if (!this.waService) return;
                if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
                    return await this.waService.sendMediaFromUrl(ctx.from, urlOrPath, caption, mediaType);
                } else if (fs.existsSync(urlOrPath)) {
                    return await this.waService.sendMedia(ctx.from, urlOrPath, caption);
                } else {
                    return await this.waService.sendMediaFromUrl(ctx.from, urlOrPath, caption, mediaType);
                }
            },
            react: async (emoji: string) => {
                if (ctx.rawMessage && ctx.socket) {
                    try {
                        await ctx.socket.sendMessage(ctx.from, { react: { text: emoji, key: ctx.rawMessage.key } });
                    } catch (e) {}
                }
            },
            getPlugins: () => this.getPlugins()
        };

        for (const [id, plugin] of this.plugins.entries()) {
            try {
                if (typeof plugin.onMessage === 'function') {
                    const res = await Promise.resolve(plugin.onMessage(ctx, api)).catch(e => {
                        console.error(`[Plugin:${id}] Runtime error in onMessage:`, e.message);
                    });
                    if (res === true) handled = true;
                }
            } catch(e: any) {
                console.error(`[Plugin:${id}] Exception during execution:`, e.message);
            }
        }

        return handled;
    }
}
