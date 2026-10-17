import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { crmService } from '../../src/core/crm.service';
import { accessControl } from '../../src/core/accessControl';
import { telemetry } from '../../src/core/telemetry';

describe('FASE 6: Desacoplamiento de writeFileSync síncrono en CRM, AccessControl y Telemetría', () => {
    let writeFileSyncSpy: any;

    beforeEach(() => {
        writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync');
    });

    afterEach(async () => {
        writeFileSyncSpy.mockRestore();
        await crmService.flush();
        await accessControl.flush();
        await telemetry.flush();
    });

    it('CRMService.autoTrackContact no debe ejecutar writeFileSync síncrono en cada mensaje entrante', async () => {
        writeFileSyncSpy.mockClear();

        // Simular ráfaga de 5 mensajes entrantes de WhatsApp
        for (let i = 0; i < 5; i++) {
            crmService.autoTrackContact(`521999000000${i}@s.whatsapp.net`, `Usuario ${i}`);
        }

        // writeFileSync no debe haberse invocado 5 veces sincrónicamente bloqueando el event loop
        expect(writeFileSyncSpy).not.toHaveBeenCalled();

        // En memoria los contactos deben estar actualizados inmediatamente
        const contact = crmService.getContact('5219990000000');
        expect(contact).toBeDefined();
        expect(contact?.name).toBe('Usuario 0');

        // Esperar a que el debouncer asíncrono complete
        await crmService.flush();
    });

    it('AccessControlService no debe invocar writeFileSync en cambios de lista y debe acumular en memoria', async () => {
        writeFileSyncSpy.mockClear();

        // Modificar lista mediante comando
        accessControl.processAdminCommand('!lista add 5219991112233');

        // No debe haber llamado writeFileSync bloqueante
        expect(writeFileSyncSpy).not.toHaveBeenCalled();

        // La regla en memoria debe estar activa de inmediato
        expect(accessControl.canReplyTo('5219991112233')).toBe(true);

        await accessControl.flush();
    });

    it('TelemetryCollector.recordLLMRequest no debe invocar writeFileSync en cada llamada a LLM', async () => {
        writeFileSyncSpy.mockClear();

        // Simular 10 peticiones consecutivas al LLM
        for (let i = 0; i < 10; i++) {
            telemetry.recordLLMRequest('groq', 150, 200);
        }

        // writeFileSync no debe haberse llamado 10 veces de forma síncrona
        expect(writeFileSyncSpy).not.toHaveBeenCalled();

        // Las métricas en memoria deben estar disponibles de forma instantánea
        const data = telemetry.getData();
        expect(data.llm.totalRequests).toBeGreaterThanOrEqual(10);
        expect(data.llm.totalTokens).toBeGreaterThanOrEqual(1500);

        await telemetry.flush();
    });

    it('flushSync debe volcar inmediatamente el estado sucio al cerrarse el proceso', () => {
        crmService.autoTrackContact('5219998887766@s.whatsapp.net', 'Usuario Cierre');
        writeFileSyncSpy.mockClear();

        crmService.flushSync();
        expect(writeFileSyncSpy).toHaveBeenCalled();
    });
});
