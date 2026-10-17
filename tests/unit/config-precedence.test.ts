import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, getAllConfig, setConfig, invalidateConfigCache } from '../../src/core/config';
import { getSettings, updateSettings, setAdapter } from '../../src/core/dbManager';
import { LowdbAdapter } from '../../src/core/db/lowdb.adapter';
import { cacheManager } from '../../src/utils/cache';
import fs from 'fs';
import path from 'path';

describe('FASE 4: Precedencia Unificada de Configuración y Caché Inmutable', () => {
    const testDbPath = path.resolve('data/test_config_precedence.json');

    beforeEach(async () => {
        invalidateConfigCache();
        cacheManager.clear();
        delete process.env.AI_ENABLED;
        delete process.env.TEST_CUSTOM_KEY;

        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            } catch {}
        }
        const adapter = new LowdbAdapter(testDbPath);
        await adapter.initDB();
        setAdapter(adapter);
    });

    afterEach(() => {
        invalidateConfigCache();
        cacheManager.clear();
        delete process.env.AI_ENABLED;
        delete process.env.TEST_CUSTOM_KEY;
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            } catch {}
        }
    });

    it('debe respetar la precedencia BD > process.env > defaults en todos los lectores', async () => {
        // 1. Caso Base: No está en BD ni en process.env -> usa default de DEFAULT_BOT_SETTINGS o fallback
        expect(await getConfig('AI_ENABLED')).toBe('true');
        expect(await getConfig('NON_EXISTENT_KEY', 'default_val')).toBe('default_val');

        // 2. Establecer en process.env
        process.env.AI_ENABLED = 'false';
        invalidateConfigCache();

        expect(await getConfig('AI_ENABLED')).toBe('false');
        expect((await getAllConfig()).AI_ENABLED).toBe('false');
        expect((await getSettings()).AI_ENABLED).toBe('false');

        // 3. Sobrescribir en Base de Datos (BD tiene prioridad sobre process.env)
        await setConfig('AI_ENABLED', 'true');

        expect(await getConfig('AI_ENABLED')).toBe('true');
        expect((await getAllConfig()).AI_ENABLED).toBe('true');
        expect((await getSettings()).AI_ENABLED).toBe('true');

        // 4. Si la clave en BD se vacía (''), debe caer a process.env
        await updateSettings({ AI_ENABLED: '' });

        expect(await getConfig('AI_ENABLED')).toBe('false');
        expect((await getAllConfig()).AI_ENABLED).toBe('false');
        expect((await getSettings()).AI_ENABLED).toBe('false');
    });

    it('ambas rutas de modificación (setConfig y updateSettings) deben invalidar caché y sincronizar a todos los lectores', async () => {
        process.env.TEST_CUSTOM_KEY = 'from_env';
        invalidateConfigCache();

        // Leer para poblar caché
        const firstRead = await getConfig('TEST_CUSTOM_KEY');
        expect(firstRead).toBe('from_env');

        // Ruta 1: setConfig
        await setConfig('TEST_CUSTOM_KEY', 'via_set_config');
        expect(await getConfig('TEST_CUSTOM_KEY')).toBe('via_set_config');
        expect((await getAllConfig()).TEST_CUSTOM_KEY).toBe('via_set_config');
        expect((await getSettings()).TEST_CUSTOM_KEY).toBe('via_set_config');

        // Ruta 2: updateSettings
        await updateSettings({ TEST_CUSTOM_KEY: 'via_update_settings' });
        expect(await getConfig('TEST_CUSTOM_KEY')).toBe('via_update_settings');
        expect((await getAllConfig()).TEST_CUSTOM_KEY).toBe('via_update_settings');
        expect((await getSettings()).TEST_CUSTOM_KEY).toBe('via_update_settings');
    });

    it('la caché debe ser inmutable y proteger contra aliasing o mutaciones externas directas', async () => {
        await setConfig('bot_name', 'OriginalName');

        // Obtener objeto de configuración y mutarlo directamente
        const settings = await getSettings();
        expect(settings.bot_name).toBe('OriginalName');
        settings.bot_name = 'MutatedDirectly';

        // Una segunda lectura no debe estar contaminada
        const secondSettings = await getSettings();
        expect(secondSettings.bot_name).toBe('OriginalName');

        const allConfig = await getAllConfig();
        expect(allConfig.bot_name).toBe('OriginalName');
        allConfig.bot_name = 'MutatedAllConfig';

        const secondAllConfig = await getAllConfig();
        expect(secondAllConfig.bot_name).toBe('OriginalName');
    });

    it('getAllConfig debe servir lecturas subsecuentes desde la caché sin recrear claves', async () => {
        const spyGet = vi.spyOn(cacheManager, 'get');

        const first = await getAllConfig();
        expect(first).toBeDefined();

        const second = await getAllConfig();
        expect(second).toEqual(first);

        // Verificar que cacheManager.get fue consultado para 'all_config'
        expect(spyGet).toHaveBeenCalledWith('all_config');

        spyGet.mockRestore();
    });
});
