import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { SecretProviderManager } from './provider';

export interface MigrationOptions {
    vaultName?: string;
    envPath?: string;
    templatePath?: string;
    createInVault?: boolean;
    activateProvider?: boolean;
}

export interface MigrationResult {
    success: boolean;
    vaultName: string;
    migratedKeys: string[];
    totalKeys: number;
    templatePath: string;
    backupPath: string;
    itemsCreatedInVault: string[];
    error?: string;
}

export class SecretMigrationService {
    private static readonly SENSITIVE_KEYWORDS = [
        'KEY', 'SECRET', 'PASS', 'TOKEN', 'PASSWORD', 'CREDENTIAL', 'AUTH', 'PWD', 'PRIVATE'
    ];

    private static readonly ITEM_MAPPINGS: Record<string, { item: string; field: string }> = {
        DASHBOARD_PASS: { item: 'botmare-dashboard', field: 'password' },
        SUPERADMIN_KEY: { item: 'botmare-security', field: 'superadmin_key' },
        WEBHOOK_API_KEY: { item: 'botmare-security', field: 'webhook_key' },
        BACKUP_ENCRYPTION_KEY: { item: 'botmare-security', field: 'backup_key' },
        JWT_SECRET: { item: 'botmare-security', field: 'jwt_secret' },
        SESSION_SECRET: { item: 'botmare-security', field: 'session_secret' },
        
        // Modelos de Inteligencia Artificial
        GROQ_API_KEY: { item: 'botmare-ai', field: 'groq_api_key' },
        GEMINI_API_KEY: { item: 'botmare-ai', field: 'gemini_api_key' },
        OPENAI_API_KEY: { item: 'botmare-ai', field: 'openai_api_key' },
        DEEPSEEK_API_KEY: { item: 'botmare-ai', field: 'deepseek_api_key' },
        CEREBRAS_API_KEY: { item: 'botmare-ai', field: 'cerebras_api_key' },
        SAMBANOVA_API_KEY: { item: 'botmare-ai', field: 'sambanova_api_key' },
        SILICONFLOW_API_KEY: { item: 'botmare-ai', field: 'siliconflow_api_key' },
        MISTRAL_API_KEY: { item: 'botmare-ai', field: 'mistral_api_key' },
        TOGETHER_API_KEY: { item: 'botmare-ai', field: 'together_api_key' },
        OPENROUTER_API_KEY: { item: 'botmare-ai', field: 'openrouter_api_key' },
        NVIDIA_API_KEY: { item: 'botmare-ai', field: 'nvidia_api_key' },
        CHEAPERINFERENCE_API_KEY: { item: 'botmare-ai', field: 'cheaperinference_api_key' },

        // Telegram
        TELEGRAM_BOT_TOKEN: { item: 'botmare-telegram', field: 'token' },
        TELEGRAM_ALLOWED_USER_IDS: { item: 'botmare-telegram', field: 'allowed_user_ids' },
        TELEGRAM_ADMIN_CHAT_ID: { item: 'botmare-telegram', field: 'admin_chat_id' },

        // Integraciones
        GITHUB_TOKEN: { item: 'botmare-github', field: 'token' },
        GITHUB_WEBHOOK_SECRET: { item: 'botmare-github', field: 'webhook_secret' },
        HTTPSMS_API_KEY: { item: 'botmare-sms', field: 'api_key' },
        GOOGLE_SHEETS_SPREADSHEET_ID: { item: 'botmare-sheets', field: 'spreadsheet_id' },
        GOOGLE_SHEETS_API_KEY: { item: 'botmare-sheets', field: 'api_key' },
        DATABASE_URL: { item: 'botmare-database', field: 'database_url' },
        MONGODB_URI: { item: 'botmare-database', field: 'mongodb_uri' }
    };

    /**
     * Determina si una variable de entorno es sensible (debe ser gestionada en 1Password).
     */
    public static isSensitiveKey(key: string): boolean {
        if (this.ITEM_MAPPINGS[key]) return true;
        const upper = key.toUpperCase();
        return this.SENSITIVE_KEYWORDS.some(kw => upper.includes(kw));
    }

    /**
     * Mapea una clave de entorno a un ítem y campo de 1Password.
     */
    public static getMapping(key: string): { item: string; field: string } {
        if (this.ITEM_MAPPINGS[key]) {
            return this.ITEM_MAPPINGS[key];
        }
        const cleanField = key.toLowerCase();
        return { item: 'botmare-config', field: cleanField };
    }

    /**
     * Parsea un archivo .env en pares clave-valor preservando comentarios y formato.
     */
    public static parseEnvFile(envContent: string): Array<{ raw: string; key?: string; value?: string; isComment: boolean }> {
        const lines = envContent.split(/\r?\n/);
        return lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return { raw: line, isComment: true };
            }
            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) {
                return { raw: line, isComment: true };
            }
            const key = line.substring(0, eqIndex).trim();
            let value = line.substring(eqIndex + 1).trim();
            // Desencapsular comillas simples o dobles
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            return { raw: line, key, value, isComment: false };
        });
    }

    /**
     * Genera el contenido de la plantilla .env.op a partir de un archivo .env existente.
     */
    public static generateTemplate(envContent: string, vaultName: string = 'BotMaRe-Prod'): {
        template: string;
        migratedKeys: string[];
        itemsData: Record<string, Record<string, string>>;
    } {
        const parsed = this.parseEnvFile(envContent);
        const migratedKeys: string[] = [];
        const itemsData: Record<string, Record<string, string>> = {};
        const outputLines: string[] = [
            `# 🦊 BotMaRe AI - Plantilla de Referencias 1Password`,
            `# Generado automáticamente a partir de tu archivo .env local`,
            `# Bóveda: ${vaultName}`,
            `# Fecha: ${new Date().toISOString()}`,
            ``
        ];

        let currentSection = '';

        for (const item of parsed) {
            if (item.isComment) {
                outputLines.push(item.raw);
                continue;
            }

            const { key, value } = item;
            if (!key) continue;

            // Ignorar el selector del proveedor en la plantilla op
            if (key === 'BOTMARE_SECRET_PROVIDER') continue;

            const isSensitive = this.isSensitiveKey(key);

            // Si ya es una referencia op://, mantenerla
            if (value && value.startsWith('op://')) {
                outputLines.push(`${key}=${value}`);
                migratedKeys.push(key);
                continue;
            }

            // Si es sensible y tiene valor, mapear a op://
            if (isSensitive && value && value.trim() !== '') {
                const { item: itemTitle, field } = this.getMapping(key);
                const opRef = `op://${vaultName}/${itemTitle}/${field}`;
                outputLines.push(`${key}=${opRef}`);
                migratedKeys.push(key);

                if (!itemsData[itemTitle]) {
                    itemsData[itemTitle] = {};
                }
                itemsData[itemTitle][field] = value;
            } else {
                // Mantener configuración no sensible literal
                outputLines.push(`${key}=${value || ''}`);
            }
        }

        return {
            template: outputLines.join('\n') + '\n',
            migratedKeys,
            itemsData
        };
    }

    /**
     * Ejecuta la migración completa: genera .env.op, respalda .env y opcionalmente crea ítems en 1Password.
     */
    public static async migrate(options: MigrationOptions = {}): Promise<MigrationResult> {
        const vaultName = (options.vaultName || 'BotMaRe-Prod').trim();
        const envPath = options.envPath || path.resolve(process.cwd(), '.env');
        const templatePath = options.templatePath || path.resolve(process.cwd(), '.env.op');

        if (!fs.existsSync(envPath)) {
            return {
                success: false,
                vaultName,
                migratedKeys: [],
                totalKeys: 0,
                templatePath,
                backupPath: '',
                itemsCreatedInVault: [],
                error: `No se encontró el archivo de origen: ${envPath}`
            };
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const { template, migratedKeys, itemsData } = this.generateTemplate(envContent, vaultName);

        // 1. Crear respaldo seguro del .env
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.resolve(process.cwd(), `.env.backup.${timestamp}`);
        fs.writeFileSync(backupPath, envContent, 'utf8');

        // 2. Guardar plantilla .env.op
        fs.writeFileSync(templatePath, template, 'utf8');

        // 3. Crear ítems en 1Password si fue solicitado y la CLI está disponible
        const itemsCreatedInVault: string[] = [];
        const manager = SecretProviderManager.getInstance();

        if (options.createInVault && manager.isOpCliAvailable()) {
            for (const [itemTitle, fields] of Object.entries(itemsData)) {
                try {
                    // Construir argumentos para crear o editar la nota segura en 1Password
                    const fieldArgs = Object.entries(fields)
                        .map(([fName, fVal]) => `"${fName}=${fVal.replace(/"/g, '\\"')}"`)
                        .join(' ');

                    // Intentar crear el ítem en la bóveda
                    child_process.execSync(
                        `op item create --category="Secure Note" --title="${itemTitle}" --vault="${vaultName}" ${fieldArgs}`,
                        { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }
                    );
                    itemsCreatedInVault.push(itemTitle);
                } catch {
                    // Si ya existe, intentar editar los campos
                    try {
                        const editArgs = Object.entries(fields)
                            .map(([fName, fVal]) => `"${fName}=${fVal.replace(/"/g, '\\"')}"`)
                            .join(' ');

                        child_process.execSync(
                            `op item edit "${itemTitle}" --vault="${vaultName}" ${editArgs}`,
                            { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }
                        );
                        itemsCreatedInVault.push(itemTitle);
                    } catch {
                        // Continuar con los demás ítems sin romper la migración
                    }
                }
            }
        }

        // 4. Si se solicitó activar 1Password como proveedor, actualizar .env
        if (options.activateProvider) {
            let updatedEnv = envContent;
            const keyRegex = /^BOTMARE_SECRET_PROVIDER=.*$/m;
            if (keyRegex.test(updatedEnv)) {
                updatedEnv = updatedEnv.replace(keyRegex, 'BOTMARE_SECRET_PROVIDER=1password');
            } else {
                updatedEnv = `BOTMARE_SECRET_PROVIDER=1password\n` + updatedEnv;
            }
            fs.writeFileSync(envPath, updatedEnv, 'utf8');
            manager.setProvider('1password');
        }

        return {
            success: true,
            vaultName,
            migratedKeys,
            totalKeys: Object.keys(itemsData).reduce((acc, k) => acc + Object.keys(itemsData[k]).length, 0),
            templatePath,
            backupPath,
            itemsCreatedInVault
        };
    }
}

