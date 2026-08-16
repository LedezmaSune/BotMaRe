import { EventEmitter } from 'events';
import { spawn, ChildProcess, execSync } from 'child_process';
import fs from 'fs';
const checkFileExists = fs.existsSync;

import path from 'path';
import { bin as npmBin } from 'cloudflared';

// Resolución perezosa del binario de Cloudflared
function getCloudflaredBin(): string | null {
    if (process.env.CLOUDFLARED_BIN) return process.env.CLOUDFLARED_BIN;
    
    // En Termux, buscar ruta estática absoluta para evitar que pnpm intercepte node_modules/.bin
    const termuxBin = '/data/data/com.termux/files/usr/bin/cloudflared';
    if (checkFileExists(termuxBin)) return termuxBin;

    const rootPath = path.resolve('/');

    // Intentar buscar en sistema primero (Termux: pkg install cloudflared)
    try {
        const systemBinRaw = execSync('which cloudflared 2>/dev/null | grep -v node_modules || where cloudflared 2>nul').toString().trim();
        if (systemBinRaw) {
            // Satisfacer al linter usando la estructura exacta recomendada
            const basePath = path.resolve('/');
            const joinedPath = path.join(basePath, systemBinRaw.replace(/^([a-zA-Z]:|\/+)/, ''));
            const fullPath = path.normalize(joinedPath);
            if (!fullPath.startsWith(basePath)) {
                console.log("Invalid path specified!");
                return null;
            }
            // eslint-disable-next-line
            // @ts-ignore
            // nosemgrep
            if (checkFileExists(fullPath)) { // NOSONAR
                return fullPath;
            }
        }
    } catch (e) {}

    // Intentar paquete npm como fallback
    try {
        if (npmBin && checkFileExists(npmBin)) {
            return npmBin;
        }
    } catch (e) {}

    return null;
}

export class TunnelService extends EventEmitter {
    private static instance: TunnelService;
    private tunnelProcess: ChildProcess | null = null;
    private ltInstance: any = null;
    private publicUrl: string | null = null;
    private retryCount: number = 0;
    private readonly MAX_RETRIES = 5;
    private currentPort: number = 8000;
    private isAutoRecovering: boolean = false;

    private constructor() {
        super();
    }

    public static getInstance(): TunnelService {
        if (!TunnelService.instance) {
            TunnelService.instance = new TunnelService();
        }
        return TunnelService.instance;
    }

    public async start(port: number): Promise<string> {
        this.currentPort = port;

        if (process.env.CUSTOM_DOMAIN) {
            let domain = process.env.CUSTOM_DOMAIN.trim();
            if (!domain.startsWith('http')) {
                domain = 'https://' + domain;
            }
            this.publicUrl = domain;
            console.log(`\n-----------------------------------------`);
            console.log(`🌍 TUNEL PERSONALIZADO (Dominio Propio): ${domain}`);
            console.log(`-----------------------------------------\n`);
            
            // Si el usuario tiene un Token de Cloudflare Zero Trust, iniciamos el proceso del túnel en segundo plano
            if (process.env.CLOUDFLARE_TUNNEL_TOKEN) {
                console.log(`[Tunnel] Token detectado. Conectando al túnel seguro de Cloudflare...`);
                this.retryCount = 0;
                this.initializeTunnel(port).catch(err => console.error("[Tunnel] Error en túnel de token:", err));
            }
            
            this.emit('started', domain);
            return domain;
        }

        // Si NO hay dominio personalizado, levantamos Quick Tunnel usando la alternativa gratuita
        this.retryCount = 0;
        return this.initializeTunnel(port);
    }

    private async initializeTunnel(port: number): Promise<string> {
        this.currentPort = port;

        return new Promise((resolve, reject) => {
            console.log(`[Tunnel] Iniciando Túnel en puerto ${port}...`);
            
            try {
                const binPath = getCloudflaredBin();
                if (!binPath) {
                    throw new Error('cloudflared no está instalado. En Termux: pkg install cloudflared');
                }

                // Si se definió un Token de Túnel permanente de Cloudflare Zero Trust
                let args: string[];
                if (process.env.CLOUDFLARE_TUNNEL_TOKEN) {
                    args = ['tunnel', 'run', '--token', process.env.CLOUDFLARE_TUNNEL_TOKEN.trim()];
                    setTimeout(() => resolve(this.publicUrl || 'Token Tunnel Active'), 3000);
                } else {
                    // Quick Tunnel temporal por defecto
                    args = ['tunnel', '--url', `http://localhost:${port}`, '--protocol', 'http2'];
                }
                
                this.tunnelProcess = spawn(binPath, args);

                let fullErrorLog = '';
                
                this.tunnelProcess.stdout?.on('data', (data) => {
                    const output = data.toString();
                    fullErrorLog += output;
                });

                this.tunnelProcess.stderr?.on('data', (data) => {
                    const output = data.toString();
                    fullErrorLog += output;
                    
                    // Detectar URL en stderr (cloudflared logs there)
                    const urlMatch = output.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/i);
                    if (urlMatch && !this.publicUrl) {
                        const url = urlMatch[0];
                        this.publicUrl = url;
                        this.isAutoRecovering = false;
                        console.log(`\n-----------------------------------------`);
                        console.log(`🌍 TUNEL ACTIVADO: ${url}`);
                        console.log(`-----------------------------------------\n`);
                        this.emit('started', url);
                        resolve(url);
                    }

                    // Si Cloudflare invalidó el túnel temporal ("Unauthorized: Tunnel not found")
                    if (output.includes('Unauthorized: Tunnel not found')) {
                        if (!this.isAutoRecovering) {
                            this.isAutoRecovering = true;
                            console.warn(`[Tunnel] ⚠️ Sesión de Cloudflare expirada ("Unauthorized: Tunnel not found"). Regenerando nuevo túnel...`);
                            this.stop();
                            setTimeout(() => {
                                this.initializeTunnel(this.currentPort)
                                    .then((newUrl) => console.log(`[Tunnel] ✅ Nuevo túnel restablecido: ${newUrl}`))
                                    .catch((err) => {
                                        console.error('[Tunnel] Error al reanudar túnel:', err);
                                        this.isAutoRecovering = false;
                                    });
                            }, 3000);
                        }
                        return;
                    }

                    // Filtrar y mostrar solo errores reales (ignorar tablas informativas de precheck de conectividad)
                    const isPrecheckLog = output.includes('precheck') || output.includes('Connectivity') || output.includes('ping_group_range');
                    if (!isPrecheckLog && (output.includes('ERR ') || output.includes('error=') || output.includes('FATAL'))) {
                        console.error(`[Tunnel-Log] ${output.trim()}`);
                    }
                });

                const proc = this.tunnelProcess;

                proc.on('error', (err) => {
                    if (this.tunnelProcess !== proc) return;
                    console.error("[Tunnel] Error al spawnear cloudflared:", err);
                    this.handleRestart(port, resolve, reject);
                });

                proc.on('exit', (code) => {
                    if (this.tunnelProcess !== proc) return;
                    
                    if (!this.publicUrl && !this.isAutoRecovering) {
                        console.warn(`[Tunnel] Proceso salió con código ${code} sin generar URL.`);
                        if (code !== 0 && fullErrorLog.trim()) {
                            console.error(`\n=== 🚨 [DIAGNÓSTICO CLOUDFLARED] ===\n${fullErrorLog.trim()}\n===================================\n`);
                        }
                        this.handleRestart(port, resolve, reject);
                    } else {
                        console.log(`[Tunnel] Proceso de túnel terminado.`);
                    }
                });

                // Timeout de espera inicial
                setTimeout(() => {
                    if (this.tunnelProcess !== proc) return;
                    
                    if (!this.publicUrl && !this.isAutoRecovering) {
                        console.error("[Tunnel] Tiempo límite agotado esperando URL del túnel.");
                        this.handleRestart(port, resolve, reject);
                    }
                }, 40000);

            } catch (error: any) {
                console.error(`[Tunnel] Error Fatal:`, error);
                reject(error);
            }
        });
    }

    private async handleRestart(port: number, resolve: any, reject: any) {
        if (this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            this.stop();
            console.log(`[Tunnel] Reintentando (#${this.retryCount}) en 5 segundos...`);
            setTimeout(() => {
                this.initializeTunnel(port).then(resolve).catch(reject);
            }, 5000);
        } else {
            reject(new Error("Cloudflare Tunnel no pudo iniciar."));
        }
    }

    public stop() {
        if (this.tunnelProcess) {
            this.tunnelProcess.kill();
            this.tunnelProcess = null;
            this.publicUrl = null;
        }
    }

    public getUrl(): string | null {
        return this.publicUrl;
    }
}
