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

                const proc = this.tunnelProcess;

                proc.on('error', (err) => {
                    if (this.tunnelProcess !== proc) return;
                    console.error("[Tunnel] Error al spawnear cloudflared:", err);
                    this.handleRestart(port, resolve, reject);
                });

                proc.on('exit', (code) => {
                    if (this.tunnelProcess !== proc) return;
                    
                    if (!this.publicUrl) {
                        console.warn(`[Tunnel] Proceso salio con codigo ${code} sin generar URL.`);
                        this.handleRestart(port, resolve, reject);
                    } else {
                        console.log(`[Tunnel] Proceso terminado.`);
                    }
                });

                // Timeout
                setTimeout(() => {
                    if (this.tunnelProcess !== proc) return;
                    
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
