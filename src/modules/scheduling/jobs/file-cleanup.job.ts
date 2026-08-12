import fs from 'fs';
import path from 'path';
import { listPendingMediaPaths } from '../../../core/memory';

export class FileCleanupJob {
    /**
     * Limpia archivos huérfanos y antiguos en data/uploads (más de 30 días)
     * asegurándose de no borrar archivos vinculados a recordatorios pendientes.
     */
    static async cleanupUploads(): Promise<void> {
        try {
            const uploadDir = path.resolve('data/uploads');
            if (!fs.existsSync(uploadDir)) return;

            const files = await fs.promises.readdir(uploadDir);
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();

            const mediaPaths = await listPendingMediaPaths();
            const activePaths = new Set(
                (mediaPaths || []).map((p: string) => path.resolve(path.normalize(p)).toLowerCase())
            );
            const activeBasenames = new Set(
                (mediaPaths || []).map((p: string) => path.basename(p).toLowerCase())
            );

            let deleted = 0;
            for (const file of files) {
                const fullPath = path.join(uploadDir, file);
                const normalizedFullPath = path.resolve(path.normalize(fullPath)).toLowerCase();
                const baseName = file.toLowerCase();

                try {
                    const stats = await fs.promises.stat(fullPath);
                    if (
                        !activePaths.has(normalizedFullPath) &&
                        !activeBasenames.has(baseName) &&
                        now - Math.max(stats.mtimeMs, stats.ctimeMs) > THIRTY_DAYS_MS
                    ) {
                        await fs.promises.unlink(fullPath);
                        deleted++;
                    }
                } catch (e) {}
            }

            if (deleted > 0) {
                console.log(`[FileCleanup] Limpieza de uploads: ${deleted} archivo(s) antiguo(s) eliminado(s).`);
            }
        } catch (error: any) {
            console.error("[FileCleanup] Error en ciclo de limpieza de uploads:", error.message);
        }
    }

    /**
     * Limpia archivos temporales en data/temp (más de 10 minutos de antigüedad).
     */
    static async cleanupTemp(): Promise<void> {
        try {
            const tempDir = path.resolve('data/temp');
            if (!fs.existsSync(tempDir)) return;

            const files = await fs.promises.readdir(tempDir);
            const TEN_MINUTES_MS = 10 * 60 * 1000;
            const now = Date.now();

            const mediaPaths = await listPendingMediaPaths();
            const activePaths = new Set(
                (mediaPaths || []).map((p: string) => path.resolve(path.normalize(p)).toLowerCase())
            );
            const activeBasenames = new Set(
                (mediaPaths || []).map((p: string) => path.basename(p).toLowerCase())
            );

            let deleted = 0;
            for (const file of files) {
                const fullPath = path.join(tempDir, file);
                const normalizedFullPath = path.resolve(path.normalize(fullPath)).toLowerCase();
                const baseName = file.toLowerCase();

                try {
                    const stats = await fs.promises.stat(fullPath);
                    if (
                        !activePaths.has(normalizedFullPath) &&
                        !activeBasenames.has(baseName) &&
                        now - Math.max(stats.mtimeMs, stats.ctimeMs) > TEN_MINUTES_MS
                    ) {
                        await fs.promises.unlink(fullPath);
                        deleted++;
                    }
                } catch (e) {}
            }

            if (deleted > 0) {
                console.log(`[FileCleanup] Limpieza temporal: ${deleted} archivo(s) huérfano(s) eliminado(s) de data/temp.`);
            }
        } catch (error: any) {
            console.error("[FileCleanup] Error en limpieza de temporales:", error.message);
        }
    }

    /**
     * Purga logs antiguos (> 7 días) y copias de seguridad (> 15 días).
     */
    static async cleanupOldLogsAndBackups(): Promise<void> {
        try {
            const now = Date.now();
            const targets = [
                { dir: path.resolve('data/logs'), maxAgeMs: 7 * 24 * 60 * 60 * 1000 },
                { dir: path.resolve('backups'), maxAgeMs: 15 * 24 * 60 * 60 * 1000 }
            ];

            let totalDeleted = 0;

            for (const target of targets) {
                if (!fs.existsSync(target.dir)) continue;

                const files = await fs.promises.readdir(target.dir);
                for (const file of files) {
                    const fullPath = path.join(target.dir, file);
                    try {
                        const stats = await fs.promises.stat(fullPath);
                        if (stats.isFile() && now - Math.max(stats.mtimeMs, stats.ctimeMs) > target.maxAgeMs) {
                            await fs.promises.unlink(fullPath);
                            totalDeleted++;
                        }
                    } catch (e) {}
                }
            }

            if (totalDeleted > 0) {
                console.log(`[FileCleanup] Purga de archivos antiguos: ${totalDeleted} archivo(s) (logs/backups) eliminados.`);
            }
        } catch (error: any) {
            console.error("[FileCleanup] Error en purga de logs/backups antiguos:", error.message);
        }
    }
}
