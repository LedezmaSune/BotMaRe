import { describe, it, expect } from 'vitest';
import { parseDocument } from '../../src/utils/documentParser';
import * as xlsx from 'xlsx';

describe('DocumentParser Unit Tests', () => {
    it('debe parsear correctamente archivos txt, csv y md', async () => {
        const textContent = 'Contenido simple de texto en UTF-8';
        const txtBuf = Buffer.from(textContent, 'utf8');

        expect(await parseDocument(txtBuf, 'documento.txt')).toBe(textContent);
        expect(await parseDocument(txtBuf, 'datos.csv')).toBe(textContent);
        expect(await parseDocument(txtBuf, 'notas.md')).toBe(textContent);
    });

    it('debe parsear un libro de cálculo XLSX válido y retornar formato CSV', async () => {
        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Nombre', 'Telefono', 'Saldo'],
            ['Juan Perez', '5219991234567', 150.5],
            ['Maria Gomez', '5219997654321', 200.0]
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Clientes');
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const result = await parseDocument(buf, 'reporte.xlsx');
        expect(result).toContain('Juan Perez');
        expect(result).toContain('Maria Gomez');
        expect(result).toContain('5219991234567');
    });

    it('debe manejar un archivo XLSX malformado o corrupto retornando string vacío sin lanzar error', async () => {
        const corruptBuf = Buffer.from('PK\x03\x04 corrupt content not a valid zip or excel header 1234567890');
        const result = await parseDocument(corruptBuf, 'corrupto.xlsx');
        expect(result).toBe('');
    });

    it('debe manejar un archivo XLSX con buffer vacío o truncado sin caerse', async () => {
        const emptyBuf = Buffer.alloc(0);
        const result = await parseDocument(emptyBuf, 'vacio.xlsx');
        expect(result).toBe('');
    });

    it('debe retornar string vacío para extensiones no soportadas', async () => {
        const dummyBuf = Buffer.from('dummy binary data');
        const result = await parseDocument(dummyBuf, 'foto.png');
        expect(result).toBe('');
    });
});
