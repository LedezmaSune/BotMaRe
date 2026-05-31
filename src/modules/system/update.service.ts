import axios from 'axios';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export class UpdateService {
    private repoOwner = 'LedezmaSune';
    private repoName = 'BotMaRe';
    private repoUrl = `https://api.github.com/repos/LedezmaSune/BotMaRe/commits/main`;
    private releasesUrl = `https://api.github.com/repos/LedezmaSune/BotMaRe/releases`;
    private currentVersionFile = path.resolve('package.json');
    private releasesCache: { data: any[] | null, timestamp: number } = { data: null, timestamp: 0 };
    private CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    async checkUpdate() {
        try {
            // Get local version accurately
            const pkg = JSON.parse(fs.readFileSync(this.currentVersionFile, 'utf8'));
            const localVersion = pkg.version || "1.0.0";

            // Check remote for latest commit (simple way to see if there's 'something' new)
            // Or ideally a version.json if we want to be more specific
            const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            const response = await axios.get(this.repoUrl, {
                timeout: 5000,
                headers
            });

            const remoteCommit = response.data.sha;
            
            // Check current local commit hash
            let localCommit = "";
            try {
                localCommit = execSync('git rev-parse HEAD').toString().trim();
            } catch (e) {
                localCommit = "unknown";
            }

            return {
                currentVersion: localVersion,
                localCommit: localCommit.substring(0, 7),
                remoteCommit: remoteCommit.substring(0, 7),
                updateAvailable: localCommit !== remoteCommit && localCommit !== "unknown",
            };
        } catch (error: any) {
            console.error('[UpdateService] Error checking for updates:', error.message);
            return { error: error.message };
        }
    }

    async fetchReleases() {
        try {
            // Usar caché si es reciente
            if (this.releasesCache.data && (Date.now() - this.releasesCache.timestamp) < this.CACHE_TTL) {
                return { releases: this.releasesCache.data };
            }

            const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            const response = await axios.get(this.releasesUrl, {
                timeout: 8000,
                headers,
                params: { per_page: 20 }
            });

            const releases = response.data.map((r: any) => ({
                version: r.tag_name,
                title: r.name || r.tag_name,
                date: r.published_at,
                body: r.body || '',
                prerelease: r.prerelease,
                draft: r.draft,
                url: r.html_url
            }));

            this.releasesCache = { data: releases, timestamp: Date.now() };
            return { releases };
        } catch (error: any) {
            console.error('[UpdateService] Error fetching releases:', error.message);
            return { releases: [], error: error.message };
        }
    }

    async performUpdate() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            console.log('[UpdateService] Iniciando proceso de actualización reforzado...');
            
            // 1. Respaldo preventivo de seguridad
            const backupDir = path.resolve('backups', `pre-update-${Date.now()}`);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const dbFile = path.resolve('data/database.db');
            if (fs.existsSync(dbFile)) {
                fs.copyFileSync(dbFile, path.join(backupDir, 'database.db'));
            }
            
            const waAuthFile = path.resolve('data/whatsapp_auth.db');
            if (fs.existsSync(waAuthFile)) {
                fs.copyFileSync(waAuthFile, path.join(backupDir, 'whatsapp_auth.db'));
            }
            
            const envFile = path.resolve('.env');
            if (fs.existsSync(envFile)) {
                fs.copyFileSync(envFile, path.join(backupDir, '.env'));
            }
            console.log(`[UpdateService] Respaldo preventivo guardado en: ${backupDir}`);

            // 2. Traer último código de Git
            await execAsync('git fetch origin main');
            await execAsync('git reset --hard origin/main');
            console.log('[UpdateService] Código fuente sincronizado con origin/main.');

            // 3. Instalar nuevas dependencias
            console.log('[UpdateService] Instalando dependencias (pnpm install)...');
            await execAsync('pnpm install');

            // 4. Recompilar Dashboard
            console.log('[UpdateService] Compilando interfaz Next.js (pnpm run build)...');
            await execAsync('pnpm run build');

            // 5. Auto-reinicio si se está usando PM2
            if (process.env.PM2_HOME || process.env.pm_id) {
                setTimeout(() => {
                    console.log('[UpdateService] Reiniciando aplicación vía PM2...');
                    try {
                        execSync('pm2 restart ecosystem.config.js || pm2 restart BotMaRe-Unified || pm2 restart all');
                    } catch (e: any) {
                        console.error('[UpdateService] Fallo al intentar auto-reiniciar PM2', e.message);
                    }
                }, 3000);
                return { 
                    success: true, 
                    message: "✅ *Actualización Instalada con Éxito*\n\n" +
                             "🛡️ *Respaldo:* Creado preventivamente en `/backups`.\n" +
                             "📦 *Librerías:* Actualizadas (`pnpm install`).\n" +
                             "🏗️ *Compilación:* Completada con éxito (`pnpm run build`).\n\n" +
                             "🔄 El bot se está reiniciando vía PM2 en 3 segundos..."
                };
            }

            return { 
                success: true, 
                message: "✅ *Actualización Instalada con Éxito*\n\n" +
                         "🛡️ *Respaldo:* Creado preventivamente en `/backups`.\n" +
                         "📦 *Librerías:* Actualizadas.\n" +
                         "🏗️ *Compilación:* Completada con éxito.\n\n" +
                         "⚠️ El bot no corre bajo PM2. Por favor reinícialo manualmente en la terminal."
            };
        } catch (error: any) {
            console.error('[UpdateService] Error durante la actualización:', error.message);
            return { success: false, error: error.message };
        }
    }
}
