import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assertPublicUrl, isPrivateIp, safeDownload } from '../../src/utils/safeHttp';
import axios from 'axios';
import dns from 'dns';
import { Readable } from 'stream';

describe('FASE 3: Bloqueo de SSRF y Descargas Seguras (safeHttp)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isPrivateIp', () => {
        it('debe detectar correctamente rangos IPv4 privados y reservados', () => {
            expect(isPrivateIp('127.0.0.1')).toBe(true);
            expect(isPrivateIp('127.255.255.255')).toBe(true);
            expect(isPrivateIp('10.0.0.5')).toBe(true);
            expect(isPrivateIp('172.16.0.1')).toBe(true);
            expect(isPrivateIp('172.31.255.255')).toBe(true);
            expect(isPrivateIp('192.168.1.1')).toBe(true);
            expect(isPrivateIp('169.254.169.254')).toBe(true);
            expect(isPrivateIp('0.0.0.0')).toBe(true);
            expect(isPrivateIp('100.64.0.1')).toBe(true);
            expect(isPrivateIp('224.0.0.1')).toBe(true);
            expect(isPrivateIp('255.255.255.255')).toBe(true);
        });

        it('debe detectar correctamente rangos IPv6 privados y mapeados', () => {
            expect(isPrivateIp('::1')).toBe(true);
            expect(isPrivateIp('::')).toBe(true);
            expect(isPrivateIp('fe80::1')).toBe(true);
            expect(isPrivateIp('fc00::1')).toBe(true);
            expect(isPrivateIp('fd12:3456:789a::1')).toBe(true);
            expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
            expect(isPrivateIp('::ffff:192.168.1.10')).toBe(true);
        });

        it('debe permitir IPs públicas legítimas', () => {
            expect(isPrivateIp('8.8.8.8')).toBe(false);
            expect(isPrivateIp('1.1.1.1')).toBe(false);
            expect(isPrivateIp('93.184.216.34')).toBe(false);
        });
    });

    describe('assertPublicUrl', () => {
        it('debe rechazar esquemas no HTTP/HTTPS como file:///etc/passwd', async () => {
            await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow(
                /Esquema no permitido/
            );
            await expect(assertPublicUrl('ftp://example.com/file')).rejects.toThrow(
                /Esquema no permitido/
            );
        });

        it('debe rechazar credenciales embebidas en la URL', async () => {
            await expect(assertPublicUrl('http://admin:secret@example.com/')).rejects.toThrow(
                /Credenciales embebidas/
            );
        });

        it('debe rechazar http://127.0.0.1:8000/api/settings', async () => {
            await expect(assertPublicUrl('http://127.0.0.1:8000/api/settings')).rejects.toThrow(
                /Acceso bloqueado a IP de red privada o no pública/
            );
        });

        it('debe rechazar http://169.254.169.254/latest/meta-data/', async () => {
            await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
                /Acceso bloqueado/
            );
        });

        it('debe rechazar http://[::1]:8000/', async () => {
            await expect(assertPublicUrl('http://[::1]:8000/')).rejects.toThrow(
                /Acceso bloqueado/
            );
        });

        it('debe rechazar metadata.google.internal', async () => {
            await expect(assertPublicUrl('http://metadata.google.internal/computeMetadata/v1/')).rejects.toThrow(
                /Acceso bloqueado a destino no público o metadata/
            );
        });

        it('debe rechazar un host público que resuelve por DNS a una IP privada', async () => {
            vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
                { address: '192.168.1.50', family: 4 }
            ] as any);

            await expect(assertPublicUrl('http://internal-spoof.example.com/api')).rejects.toThrow(
                /resuelve a una dirección IP no pública/
            );
        });

        it('debe aceptar URLs públicas legítimas', async () => {
            vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
                { address: '93.184.216.34', family: 4 }
            ] as any);

            const parsed = await assertPublicUrl('https://example.com/image.png');
            expect(parsed.hostname).toBe('example.com');
            expect(parsed.protocol).toBe('https:');
        });
    });

    describe('safeDownload', () => {
        it('debe abortar si una URL pública redirige a una IP privada en el salto', async () => {
            vi.spyOn(dns.promises, 'lookup').mockImplementation(async (host: any) => {
                if (host === 'public-redirector.com') {
                    return [{ address: '93.184.216.34', family: 4 }] as any;
                }
                return [{ address: '127.0.0.1', family: 4 }] as any;
            });

            vi.spyOn(axios, 'get').mockResolvedValueOnce({
                status: 302,
                headers: { location: 'http://127.0.0.1:8000/api/settings' },
                data: null
            } as any);

            await expect(
                safeDownload('http://public-redirector.com/forward', { maxRedirects: 2 })
            ).rejects.toThrow(/Acceso bloqueado a IP de red privada o no pública/);
        });

        it('debe abortar la descarga si el stream excede maxBytes', async () => {
            vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
                { address: '93.184.216.34', family: 4 }
            ] as any);

            const stream = new Readable({
                read() {
                    // Genera chunks de 10 KB repetidamente
                    this.push(Buffer.alloc(10 * 1024, 'a'));
                }
            });

            vi.spyOn(axios, 'get').mockResolvedValueOnce({
                status: 200,
                headers: { 'content-type': 'application/octet-stream' },
                data: stream
            } as any);

            // Fijar límite de 50 KB
            await expect(
                safeDownload('https://example.com/huge-file.iso', { maxBytes: 50 * 1024 })
            ).rejects.toThrow(/Tamaño de descarga excede el límite permitido/);
        });

        it('debe descargar exitosamente si el contenido está dentro del límite', async () => {
            vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
                { address: '93.184.216.34', family: 4 }
            ] as any);

            const mockPayload = Buffer.from('contenido_de_prueba_seguro');
            const stream = Readable.from([mockPayload]);

            vi.spyOn(axios, 'get').mockResolvedValueOnce({
                status: 200,
                headers: { 'content-type': 'text/plain' },
                data: stream
            } as any);

            const res = await safeDownload('https://example.com/test.txt', { maxBytes: 1024 });
            expect(res.data.toString()).toBe('contenido_de_prueba_seguro');
            expect(res.contentType).toBe('text/plain');
            expect(res.status).toBe(200);
        });
    });
});
