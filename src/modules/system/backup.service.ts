import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import crypto from 'crypto';
import { bot } from '../../telegram/bot';
import { getSettings } from '../../core/memory';
import { InputFile } from 'grammy';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

function getEncryptionKey() {
    const password = process.env.DASHBOARD_PASS || 'admin123';
    return crypto.scryptSync(password, 'salt-botmare', 32);
}

function encryptFile(inputPath: string, outputPath: string) {
    const initVector = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, initVector);
    const input = fs.readFileSync(inputPath);
    const encrypted = Buffer.concat([initVector, cipher.update(input), cipher.final()]);
    fs.writeFileSync(outputPath, encrypted);
}

function decryptFile(inputPath: string, outputPath: string) {
    try {
        const input = fs.readFileSync(inputPath);
        const initVector = input.subarray(0, 16);
        const encryptedData = input.subarray(16);
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, initVector);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        fs.writeFileSync(outputPath, decrypted);
    } catch (error) {
        console.error('❌ Error al desencriptar archivo:', error);
        throw new Error('La contraseña de desencriptado es incorrecta o el archivo está corrupto.');
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

        // 2. Incluir Sesión de WhatsApp (Baileys)
        const authDir = path.join(process.cwd(), 'auth_info_baileys');
        if (fs.existsSync(authDir)) {
            coreZip.addLocalFolder(authDir, 'auth_info_baileys');
        }

        // 3. Incluir archivo .env
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            coreZip.addLocalFile(envPath);
        }

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
                                    : `🔐 _Contiene Base de Datos, Sesiones de WhatsApp y Configuración._`) + 
                                `\n\n🔑 _Usa la contraseña de tu Dashboard para desencriptar._`;

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
     * Restaura un respaldo desde un archivo ZIP
     */
    static async restoreBackup(zipFilePath: string): Promise<{ success: boolean; message: string }> {
        try {
            const tempDecryptedPath = path.join(this.backupDir, 'temp_decrypted.zip');
            
            // Si viene cifrado (.enc), descifrarlo primero
            if (zipFilePath.endsWith('.enc')) {
                decryptFile(zipFilePath, tempDecryptedPath);
            } else {
                fs.copyFileSync(zipFilePath, tempDecryptedPath);
            }

            const zip = new AdmZip(tempDecryptedPath);
            const tempExtractPath = path.join(this.backupDir, 'temp_restore');
            
            if (fs.existsSync(tempExtractPath)) {
                fs.rmSync(tempExtractPath, { recursive: true, force: true });
            }
            fs.mkdirSync(tempExtractPath, { recursive: true });

            // 1. Extraer a carpeta temporal
            zip.extractAllTo(tempExtractPath, true);

            // 3. Reemplazar carpeta data (si existe en el zip)
            const extractedDataPath = path.join(tempExtractPath, 'data');
            if (fs.existsSync(extractedDataPath)) {
                const currentDataPath = path.join(process.cwd(), 'data');
                if (!fs.existsSync(currentDataPath)) fs.mkdirSync(currentDataPath, { recursive: true });
                fs.cpSync(extractedDataPath, currentDataPath, { recursive: true });
            }

            // 4. Reemplazar carpeta auth_info_baileys (si existe en el zip)
            const extractedAuthPath = path.join(tempExtractPath, 'auth_info_baileys');
            if (fs.existsSync(extractedAuthPath)) {
                const currentAuthPath = path.join(process.cwd(), 'auth_info_baileys');
                if (fs.existsSync(currentAuthPath)) fs.rmSync(currentAuthPath, { recursive: true, force: true });
                fs.cpSync(extractedAuthPath, currentAuthPath, { recursive: true });
            }

            // 5. Reemplazar archivo .env (si existe en el backup)
            const extractedEnvPath = path.join(tempExtractPath, '.env');
            if (fs.existsSync(extractedEnvPath)) {
                const currentEnvPath = path.join(process.cwd(), '.env');
                fs.copyFileSync(extractedEnvPath, currentEnvPath);
            }

            // 6. Limpieza
            fs.rmSync(tempExtractPath, { recursive: true, force: true });
            if (fs.existsSync(tempDecryptedPath)) {
                fs.unlinkSync(tempDecryptedPath);
            }
            
            return { 
                success: true, 
                message: 'Información restaurada con éxito. El bot debe reiniciarse para aplicar todos los cambios.' 
            };
        } catch (error: any) {
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
            const { listReminders } = require('../../core/memory');
            const files = fs.readdirSync(uploadDir);
            const now = Date.now();
            const msThreshold = daysToKeep * 24 * 60 * 60 * 1000;

            // Obtener lista de archivos que SÍ están en uso por recordatorios pendientes
            const pendingReminders = await listReminders('owner');
            const activePaths = new Set(pendingReminders.map((r: any) => r.mediaPath).filter(Boolean));

            let deletedCount = 0;
            files.forEach(file => {
                const filePath = path.join(uploadDir, file);
                const stats = fs.statSync(filePath);

                // Si el archivo NO está en uso Y es más viejo que el umbral
                if (!activePaths.has(filePath) && (now - stats.mtimeMs > msThreshold)) {
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
     * Crea un respaldo legible (TXT + Carpeta de Medios) sin cifrar
     */
    static async createHumanReadableBackup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const exportZip = new AdmZip();
        
        // 1. Obtener datos de la base de datos
        const { getSettings, listTemplates, listReminders } = require('../../core/memory');
        const settings = await getSettings();
        const templates = await listTemplates();
        const reminders = await listReminders('owner', true);

        // 2. Crear archivo de texto de resumen
        let summary = `=================================================\n`;
        summary += `   RESPALDO LEGIBLE - BOTMARE AI\n`;
        summary += `   Generado el: ${new Date().toLocaleString()}\n`;
        summary += `=================================================\n\n`;

        summary += `--- CONFIGURACIÓN GENERAL ---\n`;
        summary += `Nombre del Bot: ${settings.bot_name}\n`;
        summary += `IA Activada: ${settings.AI_ENABLED}\n`;
        summary += `Grupos Permitidos: ${settings.ALLOWED_GROUPS || 'Ninguno'}\n\n`;

        summary += `--- PERSONALIDAD (SYSTEM PROMPT) ---\n`;
        summary += `${settings.system_prompt}\n\n`;

        summary += `--- CEREBRO DE DATOS (CONOCIMIENTO) ---\n`;
        summary += `${settings.possible_responses}\n\n`;

        summary += `--- PLANTILLAS DE MENSAJES ---\n`;
        templates.forEach((t: any) => {
            summary += `> [${t.name}]\n${t.content}\n\n`;
        });

        summary += `--- RECORDATORIOS PROGRAMADOS ---\n`;
        reminders.forEach((r: any) => {
            summary += `[${r.status.toUpperCase()}] Para: ${r.chatId} - Fecha: ${r.time}\nTexto: ${r.text}\n\n`;
        });

        exportZip.addFile('RESUMEN_BOTMARE.txt', Buffer.from(summary, 'utf8'));

        // 2.5 Añadir JSON para restauración técnica
        const technicalData = {
            settings,
            templates,
            reminders,
            version: '1.1.0',
            timestamp: new Date().toISOString()
        };
        exportZip.addFile('datos_para_restaurar.json', Buffer.from(JSON.stringify(technicalData, null, 2), 'utf8'));

        // 3. Incluir Multimedia (sin cifrar)
        const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
        if (fs.existsSync(uploadsDir) && fs.readdirSync(uploadsDir).length > 0) {
            exportZip.addLocalFolder(uploadsDir, 'multimedia');
        }

        const exportFilename = `Exportacion-LEGIBLE-${timestamp}.zip`;
        const exportFilePath = path.join(this.backupDir, exportFilename);
        
        exportZip.writeZip(exportFilePath);
        return exportFilePath;
    }

    static getBackupDir() {
        return this.backupDir;
    }
}
