import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { safeHttpRequest } from '../../utils/safeHttp';
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

    /**
     * Obtiene una API Key configurada para un proveedor seleccionando aleatoriamente si es un arreglo,
     * sin mutar la configuración global.
     */
    public getApiKey(provider: string): string | undefined {
        if (!this.apiKeysConfig?.APIKeys) return undefined;
        const keys = this.apiKeysConfig.APIKeys[provider];
        if (Array.isArray(keys) && keys.length > 0) {
            return keys[Math.floor(Math.random() * keys.length)];
        }
        return typeof keys === 'string' ? keys : undefined;
    }

    /**
     * Obtiene la URL de servicio configurada para un proveedor.
     */
    public getApiUrl(service: string): string | undefined {
        return this.apiKeysConfig?.APIs?.[service];
    }

    /**
     * Valida y sanea el ID del plugin para prevenir path traversal o nombres de archivo maliciosos.
     */
    public sanitizePluginId(id: string): string {
        if (!id || typeof id !== 'string') {
            throw new Error('ID de plugin inválido o faltante');
        }
        const trimmed = id.trim();
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
            throw new Error('ID de plugin no válido: solo se permiten caracteres alfanuméricos, guiones y guiones bajos (1-64 caracteres)');
        }
        const targetPath = path.resolve(this.pluginsDir, `${trimmed}.js`);
        const allowedDir = path.resolve(this.pluginsDir);
        if (!targetPath.startsWith(allowedDir + path.sep)) {
            throw new Error('Path traversal detectado en el ID de plugin');
        }
        return trimmed;
    }

    public loadPlugins() {
        this.plugins.clear();
        this.metadata.clear();
        
        // Cargar configuración de APIs si existe (sin mutar claves en memoria)
        const apiKeysPath = path.resolve(process.cwd(), 'data/api-keys.json');
        if (fs.existsSync(apiKeysPath)) {
            try {
                this.apiKeysConfig = JSON.parse(fs.readFileSync(apiKeysPath, 'utf8'));
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
        if (!fs.existsSync(fullPath)) return;
        const code = fs.readFileSync(fullPath, 'utf8');

        const meta: PluginMetadata = {
            id,
            name: id,
            description: "Sin descripción",
            active: true,
            code: code
        };

        try {
            // Entorno de ejecución para plugins (contención inicial).
            // NOTA: node:vm no es una frontera de seguridad estricta frente a escapes deliberados;
            // elimina caminos accidentales y no inyecta secretos ni objetos del host (como global.apiKeysConfig).
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
                module: { exports: {} },
                exports: {}
            };

            const context = vm.createContext(sandbox);
            const script = new vm.Script(code);
            script.runInContext(context, { timeout: 3000 }); // 3 sec timeout al compilar

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
        const safeId = this.sanitizePluginId(id);
        const meta = this.metadata.get(safeId);
        if (!meta) throw new Error("Plugin no encontrado");
        
        let newCode = meta.code;
        if (/active\s*:\s*(true|false)/i.test(newCode)) {
            newCode = newCode.replace(/active\s*:\s*(true|false)/i, `active: ${active}`);
        } else if (/(module\.)?exports\s*=\s*\{/i.test(newCode)) {
            newCode = newCode.replace(/(module\.)?exports\s*=\s*\{/i, `module.exports = {\n    active: ${active},`);
        }
        
        this.savePlugin(safeId, newCode);
    }

    public savePlugin(id: string, code: string) {
        const safeId = this.sanitizePluginId(id);
        const fullPath = path.resolve(this.pluginsDir, `${safeId}.js`);
        fs.writeFileSync(fullPath, code, 'utf8');
        this.loadSinglePlugin(`${safeId}.js`);
    }
    
    public deletePlugin(id: string) {
        const safeId = this.sanitizePluginId(id);
        const fullPath = path.resolve(this.pluginsDir, `${safeId}.js`);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
        this.plugins.delete(safeId);
        this.metadata.delete(safeId);
    }

    public async dispatchOnMessage(ctx: PluginContext, timeoutMs: number = 10000): Promise<boolean> {
        if (!this.waService || !ctx || !ctx.text) return false;

        let handled = false;

        // Puente seguro del host hacia WhatsApp y servicios externos
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
            callAI: async (prompt: string, systemPrompt?: string): Promise<string> => {
                try {
                    const { callLLM } = await import('../../core/llm');
                    const messages: any[] = [];
                    if (systemPrompt) {
                        messages.push({ role: 'system', content: systemPrompt });
                    }
                    messages.push({ role: 'user', content: prompt });
                    const res = await callLLM(messages);
                    return res?.content || '';
                } catch (e: any) {
                    console.error('[PluginService:callAI] Error invocando LLM:', e.message);
                    return '';
                }
            },
            httpGet: async (url: string, opts: any = {}) => {
                return await safeHttpRequest(url, { method: 'GET', ...opts });
            },
            httpPost: async (url: string, body: any, opts: any = {}) => {
                return await safeHttpRequest(url, { method: 'POST', data: body, ...opts });
            },
            getApiKey: (provider: string) => this.getApiKey(provider),
            getApiUrl: (service: string) => this.getApiUrl(service),
            getPlugins: () => this.getPlugins()
        };

        const PLUGIN_TIMEOUT_MS = timeoutMs;

        for (const [id, plugin] of this.plugins.entries()) {
            try {
                if (typeof plugin.onMessage === 'function') {
                    // ADVERTENCIA DE SEGURIDAD:
                    // Promise.race con timeout interrumpe ejecuciones asíncronas prolongadas (peticiones de red, I/O).
                    // Sin embargo, una espera síncrona infinita (como while(true){}) en node:vm bloquea el Event Loop
                    // del proceso principal y no puede ser interrumpida en el mismo hilo. Por esta razón, el aislamiento
                    // estricto requiere la Fase B (worker_threads con resourceLimits).
                    let timer: NodeJS.Timeout;
                    const timeoutPromise = new Promise((_, reject) => {
                        timer = setTimeout(() => {
                            reject(new Error(`Timeout de ejecución excedido (${PLUGIN_TIMEOUT_MS} ms)`));
                        }, PLUGIN_TIMEOUT_MS);
                    });

                    const executionPromise = Promise.resolve(plugin.onMessage(ctx, api));

                    try {
                        const res = await Promise.race([executionPromise, timeoutPromise]);
                        clearTimeout(timer!);
                        if (res === true) handled = true;
                    } catch (err: any) {
                        clearTimeout(timer!);
                        if (err.message.includes('Timeout')) {
                            console.warn(`[Plugin:${id}] ⚠️ Timeout de ejecución excedido (${PLUGIN_TIMEOUT_MS} ms) en onMessage. Bot continúa operando.`);
                        } else {
                            console.error(`[Plugin:${id}] Runtime error in onMessage:`, err.message);
                        }
                    }
                }
            } catch(e: any) {
                console.error(`[Plugin:${id}] Exception during execution:`, e.message);
            }
        }

        return handled;
    }
}
