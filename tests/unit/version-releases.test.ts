import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateService } from '../../src/modules/system/update.service';
import axios from 'axios';

// Extraer o replicar la lógica pura de semver de bin/launcher.js para test unitario
function parseSemver(v: string): [number, number, number] {
    if (!v) return [0, 0, 0];
    const clean = String(v).replace(/^v/i, '').trim();
    const parts = clean.split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareSemver(v1: string, v2: string): number {
    const [maj1, min1, pat1] = parseSemver(v1);
    const [maj2, min2, pat2] = parseSemver(v2);
    if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
    if (min1 !== min2) return min1 > min2 ? 1 : -1;
    if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
    return 0;
}

function canUpdateToTag(targetTag: string, currentVersion: string): boolean {
    return compareSemver(targetTag, currentVersion) > 0;
}

describe('Fase 7: Versionado, Releases y Prevención de Downgrade', () => {
    describe('Comparador Semver (bin/launcher.js)', () => {
        it('debe reconocer que v1.5.3 es menor que la versión actual 2.7.0', () => {
            expect(compareSemver('v1.5.3', '2.7.0')).toBe(-1);
            expect(compareSemver('1.5.3', '2.7.0')).toBe(-1);
        });

        it('debe reconocer que v2.7.0 es igual a 2.7.0', () => {
            expect(compareSemver('v2.7.0', '2.7.0')).toBe(0);
        });

        it('debe reconocer que v2.7.1 o v3.0.0 es mayor que 2.7.0', () => {
            expect(compareSemver('v2.7.1', '2.7.0')).toBe(1);
            expect(compareSemver('v3.0.0', '2.7.0')).toBe(1);
        });

        it('debe RECHAZAR checkout de tags antiguos (evitar degradar de 2.7.0 a 1.5.3)', () => {
            const currentInstalledVersion = '2.7.0';
            const gitTags = ['v1.5.3', 'v1.5.2', 'v1.5.1', 'v1.5.0'];
            
            // Ordenar desc
            gitTags.sort((a, b) => compareSemver(b, a));
            const latestTag = gitTags[0]; // v1.5.3

            expect(canUpdateToTag(latestTag, currentInstalledVersion)).toBe(false);
        });

        it('debe PERMITIR actualizar si hay un tag superior (ej. v2.8.0)', () => {
            const currentInstalledVersion = '2.7.0';
            expect(canUpdateToTag('v2.8.0', currentInstalledVersion)).toBe(true);
        });
    });

    describe('UpdateService.fetchReleases', () => {
        let updateService: UpdateService;

        beforeEach(() => {
            vi.restoreAllMocks();
            updateService = new UpdateService();
        });

        it('debe retornar las releases conocidas si GitHub API no tiene releases publicadas', async () => {
            vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: [] });

            const result = await updateService.fetchReleases();
            expect(result.releases).toBeDefined();
            expect(result.releases.length).toBeGreaterThanOrEqual(3);

            const v27 = result.releases.find((r: any) => r.version === 'v2.7.0');
            expect(v27).toBeDefined();
            expect(v27.title).toContain('2.7.0');
            expect(v27.body).toContain('WhatsApp');
        });

        it('debe retornar releases conocidas como fallback ante error de red/rate limit en GitHub', async () => {
            vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Rate limit exceeded (403)'));

            const result = await updateService.fetchReleases();
            expect(result.releases).toBeDefined();
            expect(result.releases.length).toBeGreaterThanOrEqual(3);
            expect(result.error).toBe('Rate limit exceeded (403)');

            const v27 = result.releases.find((r: any) => r.version === 'v2.7.0');
            expect(v27).toBeDefined();
        });

        it('debe mapear correctamente los releases remotos cuando GitHub los entrega', async () => {
            vi.spyOn(axios, 'get').mockResolvedValueOnce({
                data: [
                    {
                        tag_name: 'v2.8.0',
                        name: 'BotMaRe v2.8.0 Supercharged',
                        published_at: '2026-11-01T12:00:00Z',
                        body: 'Notas de la versión 2.8.0',
                        prerelease: false,
                        draft: false,
                        html_url: 'https://github.com/LedezmaSune/BotMaRe/releases/tag/v2.8.0'
                    }
                ]
            });

            const result = await updateService.fetchReleases();
            expect(result.releases).toHaveLength(1);
            expect(result.releases[0].version).toBe('v2.8.0');
            expect(result.releases[0].title).toBe('BotMaRe v2.8.0 Supercharged');
        });
    });
});
