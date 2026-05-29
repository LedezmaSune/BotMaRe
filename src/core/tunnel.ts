import { EventEmitter } from 'events';
import { spawn, ChildProcess, execSync } from 'child_process';
import fs from 'fs';

// Resolución perezosa del binario de Cloudflared
function getCloudflaredBin(): string | null {
    if (process.env.CLOUDFLARED_BIN) return process.env.CLOUDFLARED_BIN;
    
    // Intentar buscar en sistema primero (Termux: pkg install cloudflared)
    try {
        const systemBin = execSync('which cloudflared 2>/dev/null || where cloudflared 2>nul').toString().trim();
        if (systemBin && fs.existsSync(systemBin)) return systemBin;
        if (systemBin) return systemBin;
    } catch (e) {}

    // Intentar paquete npm como fallback
    try {
        const { bin } = require('cloudflared');
        if (bin && fs.existsSync(bin)) return bin;
    } catch (e) {}

    return null;
}

export class TunnelService extends EventEmitter {
    private static instance: TunnelService;
    private tunnelProcess: ChildProcess | null = null;
    private publicUrl: string | null = null;
    private retryCount: number = 0;
    private readonly MAX_RETRIES = 3;

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
        this.retryCount = 0;
        return this.initializeTunnel(port);
    }

    private async initializeTunnel(port: number): Promise<string> {
        return new Promise((resolve, reject) => {
            console.log(`[Tunnel] Inciando Tunel Manual en puerto ${port}...`);
            
            try {
                const binPath = getCloudflaredBin();
                if (!binPath) {
                    throw new Error('cloudflared no está instalado. En Termux: pkg install cloudflared');
                }

                // Command: cloudflared tunnel --url http://localhost:PORT
                const args = ['tunnel', '--url', `http://localhost:${port}`, '--protocol', 'http2'];
                
                this.tunnelProcess = spawn(binPath, args);

                this.tunnelProcess.stdout?.on('data', (data) => {
                    const output = data.toString();
                    // Optional: log or handle stdout if needed
                });

                this.tunnelProcess.stderr?.on('data', (data) => {
                    const output = data.toString();
                    
                    // Look for the URL in stderr (cloudflared logs there)
                    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
                    if (urlMatch && !this.publicUrl) {
                        const url = urlMatch[0];
                        this.publicUrl = url;
                        console.log(`\n-----------------------------------------`);
                        console.log(`🌍 TUNEL ACTIVADO: ${url}`);
                        console.log(`-----------------------------------------\n`);
                        this.emit('started', url);
                        resolve(url);
                    }

                    if (output.includes('error') || output.includes('failed')) {
                        console.error(`[Tunnel-Log] ${output.trim()}`);
                    }
                });

                this.tunnelProcess.on('error', (err) => {
                    console.error("[Tunnel] Error al spawnear cloudflared:", err);
                    this.handleRestart(port, resolve, reject);
                });

                this.tunnelProcess.on('exit', (code) => {
                    if (!this.publicUrl) {
                        console.warn(`[Tunnel] Proceso salio con codigo ${code} sin generar URL.`);
                        this.handleRestart(port, resolve, reject);
                    } else {
                        console.log(`[Tunnel] Proceso terminado.`);
                    }
                });

                // Timeout
                setTimeout(() => {
                    if (!this.publicUrl) {
                        console.error("[Tunnel] Tiempo limite agotado.");
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
            console.log(`[Tunnel] Cerrando proceso...`);
            this.tunnelProcess.kill();
            this.tunnelProcess = null;
            this.publicUrl = null;
        }
    }

    public getUrl(): string | null {
        return this.publicUrl;
    }
}
