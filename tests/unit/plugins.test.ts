import { describe, it, expect, vi } from 'vitest';
import { PluginService } from '../../src/modules/plugins/plugin.service';

describe('PluginService & Plugins Validation', () => {
    it('debe cargar e inicializar todos los plugins en data/plugins sin errores de sintaxis', () => {
        const mockWaService: any = {
            sendMessage: vi.fn(),
            sendMedia: vi.fn(),
            sendMediaFromUrl: vi.fn(),
            getStatus: () => ({ state: 'connected' })
        };

        const pluginService = PluginService.getInstance();
        pluginService.init(mockWaService);

        const plugins = pluginService.getPlugins();
        expect(plugins.length).toBeGreaterThan(0);

        // Ningún plugin activo debe tener un error de sintaxis en su carga
        for (const p of plugins) {
            expect(p.error).toBeUndefined();
            expect(p.name).toBeTruthy();
            expect(p.description).toBeTruthy();
        }

        // Verificar que los nuevos plugins existen y están activos
        const ids = plugins.map(p => p.id);
        expect(ids).toContain('google-search');
        expect(ids).toContain('summarize-text');
        expect(ids).toContain('translate');
        expect(ids).toContain('url-info');
        expect(ids).toContain('webhook');
        expect(ids).toContain('google-sheets');
    });

    it('debe responder a comandos de ayuda básicos sin lanzar excepciones', async () => {
        const mockReply = vi.fn();
        const mockWaService: any = {
            sendMessage: mockReply,
            sendMedia: vi.fn(),
            sendMediaFromUrl: vi.fn(),
            getStatus: () => ({ state: 'connected' })
        };

        const pluginService = PluginService.getInstance();
        pluginService.init(mockWaService);

        // Despachar un comando que no coincide con nada
        const handled = await pluginService.dispatchOnMessage({
            text: '!comando_inexistente_xyz',
            from: '1234567890@s.whatsapp.net',
            isGroup: false
        });

        expect(handled).toBe(false);
    });

    it('debe responder exitosamente a !menup y no enviarlo a la IA', async () => {
        const mockReply = vi.fn().mockResolvedValue({ key: { id: 'msg-123' } });
        const mockWaService: any = {
            sendMessage: mockReply,
            sendMedia: vi.fn(),
            sendMediaFromUrl: vi.fn(),
            getStatus: () => ({ state: 'connected' })
        };

        const pluginService = PluginService.getInstance();
        pluginService.init(mockWaService);

        const handled = await pluginService.dispatchOnMessage({
            text: '!menup',
            from: '1234567890@s.whatsapp.net',
            isGroup: false
        });

        expect(handled).toBe(true);
        expect(mockReply).toHaveBeenCalledTimes(1);
        const replyArg = mockReply.mock.calls[0][1];
        expect(replyArg).toContain('PLUGINS BOTMARE');
    });
});
