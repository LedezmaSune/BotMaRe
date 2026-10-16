import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluginService } from '../../src/modules/plugins/plugin.service';
import fs from 'fs';
import path from 'path';

describe('FASE 4: Plugins Contención y Seguridad', () => {
    const pluginService = PluginService.getInstance();

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('sanitizePluginId', () => {
        it('debe rechazar IDs con caracteres de path traversal como ../../evil', () => {
            expect(() => pluginService.sanitizePluginId('../../evil')).toThrow(/ID de plugin no válido/);
            expect(() => pluginService.sanitizePluginId('../test')).toThrow(/ID de plugin no válido/);
            expect(() => pluginService.sanitizePluginId('/root/plugin')).toThrow(/ID de plugin no válido/);
        });

        it('debe rechazar IDs con caracteres especiales o vacíos', () => {
            expect(() => pluginService.sanitizePluginId('')).toThrow(/ID de plugin inválido/);
            expect(() => pluginService.sanitizePluginId('plugin!@#')).toThrow(/ID de plugin no válido/);
            expect(() => pluginService.sanitizePluginId('plugin with spaces')).toThrow(/ID de plugin no válido/);
        });

        it('debe aceptar IDs seguros de 1 a 64 caracteres alfanuméricos, guiones y guiones bajos', () => {
            expect(pluginService.sanitizePluginId('mi_plugin-1')).toBe('mi_plugin-1');
            expect(pluginService.sanitizePluginId('Google_Search_V2')).toBe('Google_Search_V2');
        });
    });

    describe('Aislamiento y Gestión de API Keys', () => {
        it('debe obtener claves y URLs mediante getApiKey y getApiUrl sin mutar la configuración original', () => {
            (pluginService as any).apiKeysConfig = {
                APIs: { testService: 'https://api.test.com' },
                APIKeys: {
                    testProvider: ['key1', 'key2', 'key3']
                }
            };

            const key = pluginService.getApiKey('testProvider');
            expect(['key1', 'key2', 'key3']).toContain(key);

            // Verificar que la configuración original sigue siendo un array y no mutó a string
            expect(Array.isArray((pluginService as any).apiKeysConfig.APIKeys.testProvider)).toBe(true);

            const url = pluginService.getApiUrl('testService');
            expect(url).toBe('https://api.test.com');
        });
    });

    describe('Timeout en dispatchOnMessage', () => {
        it('debe interrumpir por timeout un plugin que tarde más de lo permitido sin bloquear el bot', async () => {
            const mockWaService: any = {
                sendMessage: vi.fn(),
                sendMedia: vi.fn(),
                sendMediaFromUrl: vi.fn(),
                getStatus: () => ({ state: 'connected' })
            };

            pluginService.init(mockWaService);

            // Inyectamos un plugin temporal que no termina nunca
            (pluginService as any).plugins.set('hang_plugin', {
                onMessage: async () => {
                    return new Promise((resolve) => {
                        setTimeout(resolve, 5000);
                    });
                }
            });

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Ejecutamos con timeoutMs de 50ms para la prueba unitaria
            const handled = await pluginService.dispatchOnMessage({
                text: '!cualquier_cosa',
                from: '12345@s.whatsapp.net'
            }, 50);

            expect(handled).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalled();

            // Limpiar plugin de prueba
            (pluginService as any).plugins.delete('hang_plugin');
        });
    });
});
