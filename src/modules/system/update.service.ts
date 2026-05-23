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
        try {
            console.log('[UpdateService] Starting update process...');
            // 1. Fetch latest
            execSync('git fetch origin main');
            // 2. Reset to origin (caution: overwrites local changes)
            execSync('git reset --hard origin/main');
            
            // 3. Auto-reinicio si se está usando PM2
            if (process.env.PM2_HOME || process.env.pm_id) {
                setTimeout(() => {
                    console.log('[UpdateService] Reiniciando aplicación vía PM2...');
                    try {
                        execSync('pm2 restart ecosystem.config.js || pm2 restart BotMaRe-Unified || pm2 restart all');
                    } catch (e) {
                        console.error('[UpdateService] Fallo al intentar auto-reiniciar PM2', e);
                    }
                }, 3000);
                return { success: true, message: "Actualización instalada. El sistema se auto-reiniciará en 3 segundos. Por favor espera y recarga esta página." };
            }

            return { success: true, message: "Actualización instalada. Ve a tu consola, presiona Ctrl+C y ejecuta 'pnpm run dev' o 'pnpm run start' para aplicarla." };
        } catch (error: any) {
            console.error('[UpdateService] Update failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}
