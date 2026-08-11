import fs from 'fs';
import path from 'path';

export interface MediaResolutionResult {
    exists: boolean;
    finalPath?: string;
    mediaType?: string;
    warning?: string;
}

export class MediaResolverService {
    /**
     * Intenta resolver y reparar en caliente una ruta de archivo multimedia.
     * Si la ruta no existe, busca coincidencias exactas o difusas en data/uploads.
     */
    static async resolveMediaPath(mediaPath?: string, declaredType?: string): Promise<MediaResolutionResult> {
        if (!mediaPath) {
            return { exists: false };
        }

        let resolvedPath = mediaPath;

        // 1. Verificación directa
        if (fs.existsSync(resolvedPath)) {
            return {
                exists: true,
                finalPath: resolvedPath.replace(/\\/g, '/'),
                mediaType: declaredType || this.inferMediaType(resolvedPath)
            };
        }

        // 2. Intento de reparación en directorio local data/uploads
        const fileName = path.basename(resolvedPath);
        const uploadsDir = path.resolve('data/uploads');
        const localPath = path.join(uploadsDir, fileName);

        if (fs.existsSync(localPath)) {
            return {
                exists: true,
                finalPath: localPath.replace(/\\/g, '/'),
                mediaType: declaredType || this.inferMediaType(localPath)
            };
        }

        // 3. Búsqueda difusa por prefijo (primeros 15 caracteres)
        if (fs.existsSync(uploadsDir)) {
            try {
                const filesInDir = await fs.promises.readdir(uploadsDir);
                const prefix = fileName.substring(0, 15);
                const match = filesInDir.find(f => 
                    f.startsWith(prefix) || fileName.startsWith(f.substring(0, 15))
                );

                if (match) {
                    const matchedPath = path.join(uploadsDir, match);
                    if (fs.existsSync(matchedPath)) {
                        return {
                            exists: true,
                            finalPath: matchedPath.replace(/\\/g, '/'),
                            mediaType: declaredType || this.inferMediaType(matchedPath)
                        };
                    }
                }
            } catch (err: any) {
                console.warn(`[MediaResolver] Error en búsqueda difusa de archivos: ${err.message}`);
            }
        }

        return {
            exists: false,
            warning: `Archivo no encontrado tras intento de reparación: ${mediaPath}`
        };
    }

    /**
     * Infiere el tipo de medio a partir de la extensión del archivo.
     */
    static inferMediaType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
        if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) return 'video';
        if (['.mp3', '.ogg', '.wav', '.m4a', '.aac'].includes(ext)) return 'audio';
        return 'document';
    }
}
