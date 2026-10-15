import { describe, it, expect } from 'vitest';
import { extractSheetInfo } from '../../src/modules/autoresponders/sheets.service';

describe('Google Sheets Utilities', () => {
    it('extrae correctamente el ID de hoja desde URL completa', () => {
        const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
        const info = extractSheetInfo(url);
        expect(info.spreadsheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });

    it('extrae correctamente el ID y el GID de una pestaña específica', () => {
        const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=987654321';
        const info = extractSheetInfo(url);
        expect(info.spreadsheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
        expect(info.gid).toBe('987654321');
    });

    it('soporta entrada de ID puro sin URLs', () => {
        const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
        const info = extractSheetInfo(rawId);
        expect(info.spreadsheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });
});
