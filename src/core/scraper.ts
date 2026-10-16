import axios from 'axios';

export async function scrapeUrl(url: string): Promise<string> {
    try {
        // Utilizamos un servicio externo que renderiza JavaScript y extrae Markdown limpio (ideal para IA)
        const response = await axios.get(`https://r.jina.ai/${url}`, {
            timeout: 10000,
            maxContentLength: 5 * 1024 * 1024, // 5 MB máximo
            maxBodyLength: 5 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                // Solicitar formato limpio en markdown
                'X-Return-Format': 'markdown'
            }
        });

        const markdownText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        
        // Limpiamos espacios extras y limitamos el tamaño para no saturar la memoria
        const cleanText = markdownText
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 8000);

        return cleanText;
    } catch (error: any) {
        throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
}
