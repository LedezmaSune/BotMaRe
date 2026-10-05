export async function parseDocument(buffer: Buffer, fileName: string): Promise<string> {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    
    try {
        if (['txt', 'csv', 'md'].includes(ext)) {
            return buffer.toString('utf8');
        }
        
        if (ext === 'pdf') {
            const pdfParseModule: any = await import('pdf-parse');
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const data = await pdfParse(buffer);
            return data.text || '';
        }
        
        if (ext === 'docx') {
            const mammothModule: any = await import('mammoth');
            const mammoth = mammothModule.default || mammothModule;
            const result = await mammoth.extractRawText({ buffer });
            return result.value || '';
        }
        
        if (ext === 'xlsx' || ext === 'xls') {
            const xlsx: any = await import('xlsx');
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            if (workbook.SheetNames.length > 0) {
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                return xlsx.utils.sheet_to_csv(sheet);
            }
        }
    } catch (e) {
        console.error(`[DocumentParser] Error parsing ${fileName}:`, e);
    }
    
    return '';
}
