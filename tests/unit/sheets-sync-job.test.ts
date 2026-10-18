import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SheetsSyncJob } from '../../src/modules/scheduling/jobs/sheets-sync.job';
import * as dbManager from '../../src/core/dbManager';

const mockSyncNow = vi.fn();

vi.mock('../../src/modules/autoresponders/sheets.service', () => {
    return {
        GoogleSheetsService: class MockGoogleSheetsService {
            syncNow = mockSyncNow;
        }
    };
});

vi.mock('../../src/core/dbManager', () => ({
    getSheetSyncSettings: vi.fn()
}));

describe('SheetsSyncJob Unit Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSyncNow.mockResolvedValue({ success: true, count: 5 });
    });

    it('no debe sincronizar si settings es nulo o isActive es false', async () => {
        vi.mocked(dbManager.getSheetSyncSettings).mockResolvedValue(null as any);
        await SheetsSyncJob.execute();
        expect(mockSyncNow).not.toHaveBeenCalled();

        vi.mocked(dbManager.getSheetSyncSettings).mockResolvedValue({
            isActive: false,
            spreadsheetId: 'sheet-123'
        } as any);
        await SheetsSyncJob.execute();
        expect(mockSyncNow).not.toHaveBeenCalled();
    });

    it('debe disparar sincronización inicial si isActive = true y nunca se ha sincronizado', async () => {
        vi.mocked(dbManager.getSheetSyncSettings).mockResolvedValue({
            isActive: true,
            spreadsheetId: 'sheet-123',
            syncInterval: '15m',
            lastSyncTime: null
        } as any);

        await SheetsSyncJob.execute();
        expect(mockSyncNow).toHaveBeenCalledTimes(1);
    });

    it('debe sincronizar si ha transcurrido más tiempo que el syncInterval configurado (15m)', async () => {
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
        vi.mocked(dbManager.getSheetSyncSettings).mockResolvedValue({
            isActive: true,
            spreadsheetId: 'sheet-123',
            syncInterval: '15m',
            lastSyncTime: twentyMinutesAgo
        } as any);

        await SheetsSyncJob.execute();
        expect(mockSyncNow).toHaveBeenCalledTimes(1);
    });

    it('NO debe sincronizar si el tiempo transcurrido es menor al syncInterval (15m)', async () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        vi.mocked(dbManager.getSheetSyncSettings).mockResolvedValue({
            isActive: true,
            spreadsheetId: 'sheet-123',
            syncInterval: '15m',
            lastSyncTime: fiveMinutesAgo
        } as any);

        await SheetsSyncJob.execute();
        expect(mockSyncNow).not.toHaveBeenCalled();
    });

    it('NO debe sincronizar automáticamente si el intervalo es manual', async () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        vi.mocked(dbManager.getSheetSyncSettings).mockResolvedValue({
            isActive: true,
            spreadsheetId: 'sheet-123',
            syncInterval: 'manual',
            lastSyncTime: oneDayAgo
        } as any);

        await SheetsSyncJob.execute();
        expect(mockSyncNow).not.toHaveBeenCalled();
    });
});
