import axios from 'axios';
import dns from 'dns';
import net from 'net';
import { URL } from 'url';

const CLOUD_METADATA_HOSTS = new Set([
    'metadata.google.internal',
    '169.254.169.254',
    'instance-data',
    'metadata.internal'
]);

/**
 * Determina si una dirección IP pertenece a rangos privados, loopback,
 * link-local o reservados no públicos.
 */
export function isPrivateIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return true;

    // IPv4 mapeada en IPv6 (ej. ::ffff:127.0.0.1 o ::ffff:7f00:1)
    if (ip.startsWith('::ffff:')) {
        const ipv4Part = ip.substring(7);
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipv4Part)) {
            return isPrivateIp(ipv4Part);
        }
    }

    const ipType = net.isIP(ip);
    if (ipType === 0) {
        return false;
    }

    // IPv6 checks
    if (ipType === 6) {
        const normalized = ip.toLowerCase();
        if (normalized === '::1' || normalized === '::') return true;
        // fc00::/7 (Unique Local Address: fc00:: a fdff::)
        if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;
        // fe80::/10 (Link-Local: fe80:: a febf::)
        if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true;
        return false;
    }

    // IPv4 checks
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return true;
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Red actual)
    if (a === 0) return true;
    // 10.0.0.0/8 (Privada)
    if (a === 10) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-Local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Privada: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Privada)
    if (a === 192 && b === 168) return true;
    // 224.0.0.0/4 (Multicast y Reservadas)
    if (a >= 224) return true;

    return false;
}

/**
 * Valida que una URL sea pública y segura frente a SSRF.
 * Rechaza esquemas distintos de http/https, credenciales embebidas,
 * dominios de metadata e IPs en rangos privados/locales tras resolución DNS.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
    if (!raw || typeof raw !== 'string') {
        throw new Error('URL inválida o vacía');
    }

    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new Error(`Formato de URL no válido: ${raw}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Esquema no permitido (${parsed.protocol}). Solo se permite http o https.`);
    }

    if (parsed.username || parsed.password) {
        throw new Error('Credenciales embebidas en la URL no están permitidas');
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    if (CLOUD_METADATA_HOSTS.has(hostname) || hostname.endsWith('.internal') || hostname === 'localhost') {
        throw new Error(`Acceso bloqueado a destino no público o metadata: ${hostname}`);
    }

    if (net.isIP(hostname) && isPrivateIp(hostname)) {
        throw new Error(`Acceso bloqueado a IP de red privada o no pública: ${hostname}`);
    }

    try {
        const addresses = await dns.promises.lookup(hostname, { all: true });
        if (!addresses || addresses.length === 0) {
            throw new Error(`No se pudo resolver el host: ${hostname}`);
        }

        for (const addr of addresses) {
            if (isPrivateIp(addr.address)) {
                throw new Error(`El host ${hostname} resuelve a una dirección IP no pública: ${addr.address}`);
            }
        }
    } catch (err: any) {
        if (err.message.includes('dirección IP no pública') || err.message.includes('Acceso bloqueado')) {
            throw err;
        }
        throw new Error(`Fallo de resolución DNS para ${hostname}: ${err.message}`);
    }

    return parsed;
}

export interface SafeDownloadOptions {
    maxBytes?: number;
    timeoutMs?: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
}

/**
 * Descarga contenido de una URL validando cada salto frente a SSRF
 * y cortando inmediatamente si supera el límite de bytes establecido.
 */
export async function safeDownload(
    rawUrl: string,
    options: SafeDownloadOptions = {}
): Promise<{ data: Buffer; contentType?: string; headers: Record<string, any>; status: number }> {
    const maxBytes = options.maxBytes ?? 25 * 1024 * 1024; // 25 MB por defecto
    const timeoutMs = options.timeoutMs ?? 30000;
    const maxRedirects = options.maxRedirects ?? 2;

    let currentUrl = rawUrl;
    let redirectCount = 0;

    while (true) {
        const validatedUrl = await assertPublicUrl(currentUrl);

        const response = await axios.get(validatedUrl.toString(), {
            responseType: 'stream',
            timeout: timeoutMs,
            maxRedirects: 0,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...(options.headers || {})
            }
        });

        const status = response.status;

        // Manejar redirecciones de forma manual y segura
        if ([301, 302, 303, 307, 308].includes(status)) {
            redirectCount++;
            if (redirectCount > maxRedirects) {
                throw new Error(`Se excedió el número máximo de redirecciones permitido (${maxRedirects})`);
            }

            const location = response.headers.location;
            if (!location) {
                throw new Error(`Redirección ${status} sin cabecera Location`);
            }

            currentUrl = new URL(location, validatedUrl).toString();
            continue;
        }

        if (status < 200 || status >= 300) {
            throw new Error(`HTTP Error ${status}: ${response.statusText || 'Error en la petición'}`);
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        await new Promise<void>((resolve, reject) => {
            const stream = response.data;

            stream.on('data', (chunk: Buffer) => {
                totalBytes += chunk.length;
                if (totalBytes > maxBytes) {
                    stream.destroy();
                    reject(new Error(`Tamaño de descarga excede el límite permitido de ${maxBytes} bytes`));
                } else {
                    chunks.push(chunk);
                }
            });

            stream.on('end', () => resolve());
            stream.on('error', (err: any) => reject(err));
        });

        return {
            data: Buffer.concat(chunks),
            contentType: response.headers['content-type'],
            headers: response.headers,
            status: response.status
        };
    }
}

export interface SafeHttpRequestOptions {
    method?: 'GET' | 'POST';
    data?: any;
    headers?: Record<string, string>;
    maxBytes?: number;
    timeoutMs?: number;
    maxRedirects?: number;
}

/**
 * Cliente HTTP seguro para uso en plugins y servicios del bot
 */
export async function safeHttpRequest(
    rawUrl: string,
    options: SafeHttpRequestOptions = {}
): Promise<{ data: any; headers: Record<string, any>; status: number; statusText: string }> {
    const method = options.method || 'GET';
    const maxBytes = options.maxBytes ?? 25 * 1024 * 1024;
    const timeoutMs = options.timeoutMs ?? 15000;
    const maxRedirects = options.maxRedirects ?? 2;

    if (method === 'GET') {
        const download = await safeDownload(rawUrl, {
            maxBytes,
            timeoutMs,
            maxRedirects,
            headers: options.headers
        });

        let parsedData: any = download.data.toString('utf-8');
        const ct = download.contentType || '';
        if (ct.includes('application/json')) {
            try {
                parsedData = JSON.parse(parsedData);
            } catch {}
        }

        return {
            data: parsedData,
            headers: download.headers,
            status: download.status,
            statusText: 'OK'
        };
    }

    let currentUrl = rawUrl;
    let redirectCount = 0;

    while (true) {
        const validatedUrl = await assertPublicUrl(currentUrl);

        const response = await axios({
            method: 'POST',
            url: validatedUrl.toString(),
            data: options.data,
            timeout: timeoutMs,
            maxRedirects: 0,
            maxContentLength: maxBytes,
            maxBodyLength: maxBytes,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'BotMaRe/2.7.0 (SafeHttp)',
                ...(options.headers || {})
            }
        });

        const status = response.status;
        if ([301, 302, 303, 307, 308].includes(status)) {
            redirectCount++;
            if (redirectCount > maxRedirects) {
                throw new Error(`Se excedió el número máximo de redirecciones permitido (${maxRedirects})`);
            }
            const location = response.headers.location;
            if (!location) throw new Error(`Redirección ${status} sin cabecera Location`);
            currentUrl = new URL(location, validatedUrl).toString();
            continue;
        }

        return {
            data: response.data,
            headers: response.headers,
            status: response.status,
            statusText: response.statusText || 'OK'
        };
    }
}
