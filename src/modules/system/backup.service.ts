import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import crypto from 'crypto';
import { bot } from '../../telegram/bot';
import { getSettings } from '../../core/db';
import { InputFile } from 'grammy';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const MAGIC_HEADER = Buffer.from('BMENC2'); // Encabezado de verificación de formato (GCM)
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const TAG_LENGTH = 16; // 128 bits auth tag

function getEncryptionKey(salt: Buffer): Buffer {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key || key.trim() === '') {
        throw new Error('BACKUP_ENCRYPTION_KEY no está configurada.');
    }
    return crypto.scryptSync(key.trim(), salt, 32);
}

export function encryptFile(inputPath: string, outputPath: string) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey(salt);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const input = fs.readFileSync(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Formato de archivo: MAGIC (6B) + SALT (16B) + IV (12B) + TAG (16B) + CIPHERTEXT
    const outputBuffer = Buffer.concat([MAGIC_HEADER, salt, iv, tag, encrypted]);
    fs.writeFileSync(outputPath, outputBuffer);
}

export function decryptFile(inputPath: string, outputPath: string) {
    const input = fs.readFileSync(inputPath);
    const minLength = MAGIC_HEADER.length + SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    if (input.length < minLength) {
        throw new Error('El archivo de respaldo está corrupto o tiene un tamaño inválido.');
    }

    const magic = input.subarray(0, MAGIC_HEADER.length);
    if (!magic.equals(MAGIC_HEADER)) {
        throw new Error('Formato de cifrado inválido. Se requiere un archivo cifrado con aes-256-gcm.');
    }

    let offset = MAGIC_HEADER.length;
    const salt = input.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;

    const iv = input.subarray(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;

    const tag = input.subarray(offset, offset + TAG_LENGTH);
    offset += TAG_LENGTH;

    const ciphertext = input.subarray(offset);

    const key = getEncryptionKey(salt);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    try {
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        fs.writeFileSync(outputPath, decrypted);
    } catch (error) {
        throw new Error('La clave de desencriptado es incorrecta o la integridad del archivo ha sido alterada.');
    }
}

export class BackupService {
    private static backupDir = path.join(process.cwd(), 'backups');

    /**
     * Crea archivos ZIP con el respaldo dividido en partes (Core y Multimedia)
     */
    static async createBackup(sendToTelegram: boolean = false): Promise<string[]> {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupPaths: string[] = [];

        // --- PARTE 1: CORE (Base de datos, Sesiones, Configuración) ---
        const coreZip = new AdmZip();
        
        // 1. Incluir Base de Datos
        const dbFile = path.join(process.cwd(), 'data', 'database.db');
        if (fs.existsSync(dbFile)) coreZip.addLocalFile(dbFile, 'data');
        
        const authDbFile = path.join(process.cwd(), 'data', 'whatsapp_auth.db');
        if (fs.existsSync(authDbFile)) coreZip.addLocalFile(authDbFile, 'data');

        // 2. Incluir Sesión de WhatsApp (Baileys) - OMITIDO
        // Se omiten las credenciales para evitar que adm-zip bloquee el Event Loop leyendo la BD de SQLite temporal de Baileys,
        // lo que causa que WhatsApp cierre la sesión por TimeOut ("Connection closed").
        // En caso de catástrofe, es más seguro reescanear el código QR al restaurar la DB.

        const coreFilename = `backup-P1-SISTEMA-${timestamp}.zip.enc`;
        const coreFilePath = path.join(this.backupDir, coreFilename);
        const tempCoreZip = path.join(this.backupDir, `temp-core-${timestamp}.zip`);
        
        coreZip.writeZip(tempCoreZip);
        encryptFile(tempCoreZip, coreFilePath);
        fs.unlinkSync(tempCoreZip);
        backupPaths.push(coreFilePath);

        // --- PARTE 2: MULTIMEDIA (Uploads) ---
        const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
        if (fs.existsSync(uploadsDir) && fs.readdirSync(uploadsDir).length > 0) {
            const mediaZip = new AdmZip();
            mediaZip.addLocalFolder(uploadsDir, 'data/uploads');

            const mediaFilename = `backup-P2-MEDIA-${timestamp}.zip.enc`;
            const mediaFilePath = path.join(this.backupDir, mediaFilename);
            const tempMediaZip = path.join(this.backupDir, `temp-media-${timestamp}.zip`);

            mediaZip.writeZip(tempMediaZip);
            encryptFile(tempMediaZip, mediaFilePath);
            fs.unlinkSync(tempMediaZip);
            backupPaths.push(mediaFilePath);
        }

        if (sendToTelegram) {
            await this.sendBackupToTelegram(backupPaths, 'Manual');
        }

        // Limpiar respaldos antiguos
        this.cleanOldBackups();
        this.cleanOldUploads(3);

        return backupPaths;
    }

    /**
     * Valida si una ruta interna de archivo dentro del ZIP es segura y restaurable.
     * Solo permite base de datos, templates y uploads.
     * Rechaza estrictamente plugins, .env, auth_info_baileys y path traversal.
     */
    static isPathRestorable(entryPath: string): boolean {
        const normalized = entryPath.replace(/\\/g, '/').replace(/^\/+/, '');

        // 1. Bloquear path traversal
        if (normalized.includes('..') || path.isAbsolute(normalized)) {
            return false;
        }

        // 2. Bloquear explícitamente rutas sensibles y ejecutables
        if (normalized.startsWith('data/plugins') || normalized.includes('plugins/') || normalized === 'data/plugins') {
            return false;
        }
        if (normalized === '.env' || normalized.endsWith('/.env') || normalized.includes('.env')) {
            return false;
        }
        if (normalized.startsWith('auth_info_baileys') || normalized.includes('auth_info_baileys')) {
            return false;
        }

        // 3. Directorios estructurales base
        if (
            normalized === 'data' || 
            normalized === 'data/' || 
            normalized === 'data/uploads' || 
            normalized === 'data/uploads/'
        ) {
            return true;
        }

        // 4. Archivos de base de datos permitidos
        if (
            normalized === 'data/database.db' ||
            normalized === 'data/database.json' ||
            normalized === 'data/whatsapp_auth.db'
        ) {
            return true;
        }

        // 5. Carpetas de multimedia y plantillas
        if (normalized.startsWith('data/uploads/')) {
            return true;
        }
        if (normalized.startsWith('data/templates')) {
            return true;
        }

        return false;
    }

    /**
     * Envía uno o varios archivos de respaldo a todos los administradores
     */
    static async sendBackupToTelegram(filePaths: string | string[], type: 'Manual' | 'Automático') {
        try {
            const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
            const settings = await getSettings() as any;
            const botName = settings.bot_name || process.env.NEXT_PUBLIC_APP_NAME || 'BotMaRe';
            const now = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

            if (!bot || !settings.TELEGRAM_ALLOWED_USER_IDS) return;

            const userIds = settings.TELEGRAM_ALLOWED_USER_IDS.split(',').map((id: string) => id.trim());

            for (const filePath of paths) {
                const filename = path.basename(filePath);
                const isMedia = filename.includes('MEDIA');
                
                const caption = `📦 *RESPALDO: ${isMedia ? 'PARTE 2 (MULTIMEDIA)' : 'PARTE 1 (SISTEMA)'}*\n\n` +
                                `🤖 *Bot:* ${botName}\n` +
                                `📁 *Archivo:* \`${filename}\`\n` +
                                `📅 *Fecha:* ${now}\n` +
                                `⚙️ *Tipo:* ${type}\n\n` +
                                (isMedia 
                                    ? `🖼️ _Contiene todas las fotos y vídeos de los recordatorios._`
                                    : `🔐 _Contiene Base de Datos y Configuración (Escanea el QR nuevamente al restaurar)._`) + 
                                `\n\n🔑 _Usa BACKUP_ENCRYPTION_KEY para desencriptar._`;

                for (const userId of userIds) {
                    try {
                        await bot.api.sendDocument(userId, new InputFile(filePath), {
                            caption,
                            parse_mode: 'Markdown'
                        });
                    } catch (e) {
                        console.error(`❌ Error enviando backup ${filename} al usuario ${userId}:`, e);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error en el proceso de envío a Telegram:', error);
        }
    }

    /**
     * Inicia la tarea programada para respaldo diario vía Telegram
     */
    static initScheduledBackup() {
        // Ejecutar todos los días a las 3:00 AM (0 3 * * *)
        cron.schedule('0 3 * * *', async () => {
            console.log('📦 [Backup] Iniciando respaldo diario programado...');
            try {
                const filePaths = await this.createBackup();
                await this.sendBackupToTelegram(filePaths, 'Automático');
                
                // Limpiar respaldos antiguos (mantener solo los últimos 7 días localmente)
                this.cleanOldBackups(7);

                // Limpiar multimedia antigua (que no esté en uso y tenga más de 3 días)
                await this.cleanOldUploads(3);
                
            } catch (error) {
                console.error('❌ Error en el respaldo programado:', error);
            }
        });
    }

    /**
     * Limpia respaldos antiguos del disco (mantiene solo los últimos X días)
     */
    private static cleanOldBackups(daysToKeep: number = 7) {
        if (!fs.existsSync(this.backupDir)) return;
        
        console.log(`🧹 [Backup] Limpiando respaldos con más de ${daysToKeep} días...`);
        const files = fs.readdirSync(this.backupDir);
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;

        files.forEach(file => {
            // Solo procesar archivos .zip.enc generados por el sistema
            if (file.endsWith('.zip.enc') || file.endsWith('.zip')) {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtimeMs > (daysToKeep * msPerDay)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Borrado respaldo antiguo: ${file}`);
                    } catch (e) {
                        console.error(`❌ No se pudo borrar ${file}:`, e);
                    }
                }
            }
        });
    }

    /**
     * Restaura un respaldo desde un archivo ZIP cifrado (.enc) validando índices contra allowlist.
     */
    static async restoreBackup(zipFilePath: string): Promise<{ success: boolean; message: string }> {
        // 1. Exigir que el archivo esté cifrado (.enc)
        if (!zipFilePath.endsWith('.enc')) {
            return {
                success: false,
                message: 'Restauración rechazada: el archivo no está cifrado. Solo se admiten archivos cifrados (.enc).'
            };
        }

        const runId = Date.now();
        const tempDecryptedPath = path.join(this.backupDir, `temp_decrypted_${runId}.zip`);
        const tempExtractPath = path.join(this.backupDir, `temp_restore_${runId}`);

        try {
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }
            
            // 2. Descifrar el archivo principal
            decryptFile(zipFilePath, tempDecryptedPath);

            const zip = new AdmZip(tempDecryptedPath);
            const entries = zip.getEntries();

            // 3. Validar entradas del zip contra la allowlist antes de extraer
            for (const entry of entries) {
                const entryName = entry.entryName.replace(/\\/g, '/');

                // Si es un archivo de parte anidada (ej. backup-P1-SISTEMA.zip.enc)
                if (entryName.endsWith('.enc')) {
                    continue;
                }

                if (!this.isPathRestorable(entryName)) {
                    if (fs.existsSync(tempDecryptedPath)) fs.unlinkSync(tempDecryptedPath);
                    return {
                        success: false,
                        message: `Restauración rechazada: el archivo contiene rutas no autorizadas o potencialmente peligrosas ("${entryName}").`
                    };
                }
            }

            // 4. Extraer a carpeta temporal
            if (fs.existsSync(tempExtractPath)) {
                fs.rmSync(tempExtractPath, { recursive: true, force: true });
            }
            fs.mkdirSync(tempExtractPath, { recursive: true });
            zip.extractAllTo(tempExtractPath, true);

            // 5. Procesar y validar archivos .enc anidados (multi-parte)
            const extractedFiles = fs.readdirSync(tempExtractPath);
            for (const file of extractedFiles) {
                if (file.endsWith('.enc')) {
                    const nestedEncPath = path.join(tempExtractPath, file);
                    const nestedDecryptedPath = path.join(tempExtractPath, file.replace('.enc', ''));
                    decryptFile(nestedEncPath, nestedDecryptedPath);

                    const nestedZip = new AdmZip(nestedDecryptedPath);
                    for (const nestedEntry of nestedZip.getEntries()) {
                        const nestedName = nestedEntry.entryName.replace(/\\/g, '/');
                        if (!this.isPathRestorable(nestedName)) {
                            fs.rmSync(tempExtractPath, { recursive: true, force: true });
                            if (fs.existsSync(tempDecryptedPath)) fs.unlinkSync(tempDecryptedPath);
                            return {
                                success: false,
                                message: `Restauración rechazada: el archivo de parte contiene rutas no autorizadas o peligrosas ("${nestedName}").`
                            };
                        }
                    }

                    nestedZip.extractAllTo(tempExtractPath, true);
                    fs.unlinkSync(nestedDecryptedPath);
                }
            }

            // 6. Aplicar restauración segura únicamente sobre las rutas autorizadas de data
            const extractedDataPath = path.join(tempExtractPath, 'data');
            if (fs.existsSync(extractedDataPath)) {
                const currentDataPath = path.join(process.cwd(), 'data');
                if (!fs.existsSync(currentDataPath)) fs.mkdirSync(currentDataPath, { recursive: true });

                const dataItems = fs.readdirSync(extractedDataPath);
                for (const item of dataItems) {
                    const itemRelPath = `data/${item}`;
                    if (this.isPathRestorable(itemRelPath) || item === 'uploads' || item.startsWith('templates')) {
                        fs.cpSync(path.join(extractedDataPath, item), path.join(currentDataPath, item), { recursive: true });
                    }
                }
            }

            // 7. Limpieza
            fs.rmSync(tempExtractPath, { recursive: true, force: true });
            if (fs.existsSync(tempDecryptedPath)) {
                fs.unlinkSync(tempDecryptedPath);
            }
            
            return { 
                success: true, 
                message: 'Información y archivos multimedia restaurados con éxito. El bot debe reiniciarse para aplicar todos los cambios.' 
            };
        } catch (error: any) {
            if (fs.existsSync(tempExtractPath)) fs.rmSync(tempExtractPath, { recursive: true, force: true });
            if (fs.existsSync(tempDecryptedPath)) fs.unlinkSync(tempDecryptedPath);
            console.error('❌ Error en restauración:', error);
            return { success: false, message: error.message || 'Error desconocido durante la restauración.' };
        }
    }

    /**
     * Limpia archivos multimedia antiguos que ya no están en recordatorios activos
     */
    static async cleanOldUploads(daysToKeep: number = 3) {
        const uploadDir = path.join(process.cwd(), 'data', 'uploads');
        if (!fs.existsSync(uploadDir)) return;

        console.log(`🧹 [System] Iniciando limpieza de multimedia antigua (>${daysToKeep} días)...`);
        
        try {
            const { listPendingMediaPaths } = require('../../core/db');
            const files = fs.readdirSync(uploadDir);
            const now = Date.now();
            const msThreshold = daysToKeep * 24 * 60 * 60 * 1000;

            // Obtener lista de archivos que SÍ están en uso por recordatorios pendientes
            const mediaPaths = await listPendingMediaPaths();
            const activePaths = new Set(
                (mediaPaths || []).map((p: string) => path.resolve(path.normalize(p)).toLowerCase())
            );
            const activeBasenames = new Set(
                (mediaPaths || []).map((p: string) => path.basename(p).toLowerCase())
            );

            let deletedCount = 0;
            files.forEach(file => {
                const filePath = path.join(uploadDir, file);
                const normalizedFilePath = path.resolve(path.normalize(filePath)).toLowerCase();
                const baseName = file.toLowerCase();
                const stats = fs.statSync(filePath);

                // Si el archivo NO está en uso Y es más viejo que el umbral
                if (
                    !activePaths.has(normalizedFilePath) &&
                    !activeBasenames.has(baseName) &&
                    (now - Math.max(stats.mtimeMs, stats.ctimeMs) > msThreshold)
                ) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    } catch (e) {
                        console.error(`❌ No se pudo borrar multimedia ${file}:`, e);
                    }
                }
            });

            if (deletedCount > 0) {
                console.log(`✅ [System] Se borraron ${deletedCount} archivos multimedia antiguos.`);
            }
        } catch (error) {
            console.error('❌ Error en la limpieza de multimedia:', error);
        }
    }

    /**
     * Crea un respaldo legible (TXT + JSON + Carpeta de Medios) y lo cifra con la clave de respaldo.
     * Elimina refreshToken, private_key y contraseñas del archivo JSON.
     */
    static async createHumanReadableBackup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const exportZip = new AdmZip();
        
        // 1. Obtener datos de la base de datos
        const { getSettings, listTemplates, listReminders } = require('../../core/db');
        const rawSettings = (await getSettings()) || {};
        const templates = await listTemplates();
        const reminders = await listReminders('owner', true);

        // Eliminar secretos sensibles del respaldo legible
        const {
            refreshToken,
            private_key,
            DASHBOARD_PASS,
            SUPERADMIN_KEY,
            BACKUP_ENCRYPTION_KEY,
            ...safeSettings
        } = rawSettings;

        // 2. Crear archivo de texto de resumen
        let summary = `=================================================\n`;
        summary += `   RESPALDO LEGIBLE - BOTMARE AI\n`;
        summary += `   Generado el: ${new Date().toLocaleString()}\n`;
        summary += `=================================================\n\n`;

        summary += `--- CONFIGURACIÓN GENERAL ---\n`;
        summary += `Nombre del Bot: ${safeSettings.bot_name || 'BotMaRe'}\n`;
        summary += `IA Activada: ${safeSettings.AI_ENABLED}\n`;
        summary += `Grupos Permitidos: ${safeSettings.ALLOWED_GROUPS || 'Ninguno'}\n\n`;

        summary += `--- PERSONALIDAD (SYSTEM PROMPT) ---\n`;
        summary += `${safeSettings.system_prompt || ''}\n\n`;

        summary += `--- CEREBRO DE DATOS (CONOCIMIENTO) ---\n`;
        summary += `${safeSettings.possible_responses || ''}\n\n`;

        summary += `--- PLANTILLAS DE MENSAJES ---\n`;
        (templates || []).forEach((t: any) => {
            summary += `> [${t.name}]\n${t.content}\n\n`;
        });

        summary += `--- RECORDATORIOS PROGRAMADOS ---\n`;
        (reminders || []).forEach((r: any) => {
            summary += `[${r.status.toUpperCase()}] Para: ${r.chatId} - Fecha: ${r.time}\nTexto: ${r.text}\n\n`;
        });

        exportZip.addFile('RESUMEN_BOTMARE.txt', Buffer.from(summary, 'utf8'));

        // 2.5 Añadir JSON para restauración técnica (sin secretos)
        const technicalData = {
            settings: safeSettings,
            templates,
            reminders,
            version: '2.7.0',
            timestamp: new Date().toISOString()
        };
        exportZip.addFile('datos_para_restaurar.json', Buffer.from(JSON.stringify(technicalData, null, 2), 'utf8'));

        // 3. Incluir Multimedia
        const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
        if (fs.existsSync(uploadsDir) && fs.readdirSync(uploadsDir).length > 0) {
            exportZip.addLocalFolder(uploadsDir, 'multimedia');
        }

        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        const exportEncFilename = `Exportacion-LEGIBLE-${timestamp}.zip.enc`;
        const exportEncFilePath = path.join(this.backupDir, exportEncFilename);
        const tempZip = path.join(this.backupDir, `temp-export-${timestamp}-${Date.now()}.zip`);
        
        exportZip.writeZip(tempZip);
        encryptFile(tempZip, exportEncFilePath);
        fs.unlinkSync(tempZip);

        return exportEncFilePath;
    }

    static getBackupDir() {
        return this.backupDir;
    }
}
