import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AppError } from './errorHandler';

const basePath = process.cwd();
const joinedDir = path.join(basePath, 'data', 'uploads');
const uploadDir = path.normalize(joinedDir);

// El linter de seguridad requiere esta validación explícita incluso si el input es estático
if (!uploadDir.startsWith(basePath)) {
    throw new Error('Invalid path specified!');
}

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Implementación estricta de mitigación CWE-22: usar un UUID aleatorio
        // en lugar de depender del nombre de archivo original suministrado por el usuario
        const id = crypto.randomUUID();
        // Preservamos la extensión (sanitizada) para mantener el formato del archivo
        const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, `${id}${ext}`);
    }
});

// Filtro de seguridad avanzado para evitar subida de ejecutables o scripts maliciosos
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.ts', '.php', '.pl', '.py'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(ext)) {
        return cb(new AppError('Tipo de archivo no permitido por razones de seguridad.', 403));
    }

    cb(null, true);
};

// Instancia global robusta de subida
export const secureUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // Límite estricto de 100MB por archivo (configurable)
        files: 20 // Máximo 20 archivos a la vez
    }
});
