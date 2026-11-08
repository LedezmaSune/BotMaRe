import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import dotenv from 'dotenv';
import { SecretProviderType, SecretProviderHealth, SecretReferenceInfo } from './types';

export class SecretProviderManager {
    private static instance: SecretProviderManager | null = null;
    private currentProvider: SecretProviderType = 'dotenv';
    private initialized: boolean = false;
    private initError: string | null = null;
    private templatePath: string = path.resolve(process.cwd(), '.env.op');

    private constructor() {
        this.currentProvider = this.detectConfiguredProvider();
    }

    public static getInstance(): SecretProviderManager {
        if (!SecretProviderManager.instance) {
            SecretProviderManager.instance = new SecretProviderManager();
        }
        return SecretProviderManager.instance;
    }

    /**
     * Detecta el proveedor configurado en el sistema según variables de entorno y archivos.
     */
    private detectConfiguredProvider(): SecretProviderType {
        const explicit = process.env.BOTMARE_SECRET_PROVIDER?.trim().toLowerCase();
        if (explicit === '1password' || explicit === 'op') {
            return '1password';
        }
        if (explicit === 'environment' || explicit === 'env') {
            return 'environment';
        }
        if (explicit === 'dotenv') {
            return 'dotenv';
        }

        // Si no se especificó explícitamente pero existe .env.op y no .env, sugerir 1password
        if (fs.existsSync(this.templatePath) && !fs.existsSync(path.resolve(process.cwd(), '.env'))) {
            return '1password';
        }

        return 'dotenv';
    }

    public getProvider(): SecretProviderType {
        return this.currentProvider;
    }

    public setProvider(provider: SecretProviderType): void {
        this.currentProvider = provider;
        this.initialized = false;
        this.initError = null;
    }

    /**
     * Asegura y retorna el token de servicio de 1Password cargado en process.env.
     * Busca en process.env y en rutas estándar de Linux/Debian (/etc/botmare/op.token).
     */
    public static ensureServiceAccountToken(): string | null {
        if (process.env.OP_SERVICE_ACCOUNT_TOKEN && process.env.OP_SERVICE_ACCOUNT_TOKEN.trim()) {
            return process.env.OP_SERVICE_ACCOUNT_TOKEN.trim();
        }

        const candidatePaths = [
            '/etc/botmare/op.token',
            path.join(process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE || '' : ''), '.config/botmare/op_service_account.token'),
            path.resolve(process.cwd(), '.op_token')
        ];

        for (const cPath of candidatePaths) {
            try {
                if (fs.existsSync(cPath)) {
                    const token = fs.readFileSync(cPath, 'utf8').trim();
                    if (token) {
                        process.env.OP_SERVICE_ACCOUNT_TOKEN = token;
                        return token;
                    }
                }
            } catch {}
        }
        return null;
    }

    /**
     * Inicializa la carga de secretos según el proveedor seleccionado.
     * REGLA DEVSECOPS: PROHIBIDO fallback silencioso a otro proveedor si 1Password falla.
     */
    public initialize(): void {
        if (this.initialized) return;

        try {
            switch (this.currentProvider) {
                case 'dotenv':
                    this.initializeDotenv();
                    break;
                case 'environment':
                    this.initializeEnvironment();
                    break;
                case '1password':
                    this.initialize1Password();
                    break;
                default:
                    throw new Error(`Proveedor de secretos no soportado: '${this.currentProvider}'. Opciones válidas: 'dotenv', 'environment', '1password'.`);
            }
            this.initialized = true;
            this.initError = null;
        } catch (err: any) {
            this.initError = this.sanitizeErrorMessage(err.message || String(err));
            throw new Error(`[SecretProvider] Error fatal inicializando proveedor '${this.currentProvider}': ${this.initError}`);
        }
    }

    /**
     * Proveedor tradicional: Carga el archivo .env con dotenv.
     */
    private initializeDotenv(): void {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
        } else {
            dotenv.config();
        }
    }

    /**
     * Proveedor environment: Confía en las variables ya inyectadas por el SO / contenedor / CI.
     */
    private initializeEnvironment(): void {
        // No carga .env físico, asume process.env ya poblado
    }

    /**
     * Proveedor 1Password Secrets Manager:
     * - Verifica presencia de 1Password CLI ('op').
     * - Inyecta secretos en memoria usando 'op inject' o verifica resolución previa vía 'op run'.
     * - Comprueba que no queden referencias 'op://' sin resolver.
     * - Falla de forma explícita y audible ante cualquier error de autenticación o sintaxis.
     */
    private initialize1Password(): void {
        // Asegurar que el token de cuenta de servicio esté cargado en process.env
        SecretProviderManager.ensureServiceAccountToken();

        // 1. Verificar si 1Password CLI está disponible en el PATH
        if (!this.isOpCliAvailable()) {
            throw new Error(
                "1Password CLI ('op') no se encuentra instalado o no está disponible en el PATH del sistema. " +
                "Instala 1Password CLI (https://developer.1password.com/docs/cli/get-started/) o " +
                "cambia el proveedor a 'dotenv' configurando BOTMARE_SECRET_PROVIDER=dotenv."
            );
        }

        // 2. Si el proceso ya fue ejecutado mediante 'op run', process.env ya contendrá los valores
        // Verificamos si aún quedan referencias 'op://' sin resolver en variables clave
        const unresolvedInEnv = this.getUnresolvedOpReferencesInProcess();

        if (unresolvedInEnv.length > 0) {
            throw new Error(
                `Se detectaron referencias de 1Password sin resolver en el entorno: [${unresolvedInEnv.join(', ')}]. ` +
                `Asegúrate de que el token de servicio (OP_SERVICE_ACCOUNT_TOKEN) tenga permisos sobre las bóvedas indicadas.`
            );
        }

        // 3. Si existe plantilla .env.op y faltan variables requeridas en process.env, resolver en memoria con 'op inject'
        const hasMissingRequired = this.hasMissingMandatoryEnv();

        if (hasMissingRequired && fs.existsSync(this.templatePath)) {
            try {
                // Ejecutar 'op inject' leyendo .env.op e inyectando solo en memoria (stdout)
                const templateContent = fs.readFileSync(this.templatePath, 'utf8');
                const injectedOutput = child_process.execSync('op inject', {
                    input: templateContent,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env },
                    maxBuffer: 10 * 1024 * 1024
                });

                // Parsear el resultado inyectado en memoria sin tocar el disco
                const parsed = dotenv.parse(injectedOutput);
                for (const [key, val] of Object.entries(parsed)) {
                    if (val && !val.startsWith('op://')) {
                        process.env[key] = val;
                    }
                }
            } catch (execErr: any) {
                const cleanError = this.sanitizeErrorMessage(execErr.stderr || execErr.message || String(execErr));
                throw new Error(`Fallo al resolver referencias con 'op inject': ${cleanError}`);
            }
        }

        // 4. Verificación final de referencias no resueltas tras inyección
        const stillUnresolved = this.getUnresolvedOpReferencesInProcess();
        if (stillUnresolved.length > 0) {
            throw new Error(`Referencias no resueltas tras inyección de 1Password: [${stillUnresolved.join(', ')}].`);
        }
    }

    /**
     * Comprueba si el binario 'op' está disponible en el entorno del sistema.
     */
    public isOpCliAvailable(): boolean {
        try {
            SecretProviderManager.ensureServiceAccountToken();
            child_process.execSync('op --version', { stdio: 'ignore', timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Detecta claves en process.env cuyos valores contengan referencias 'op://' sin resolver.
     */
    private getUnresolvedOpReferencesInProcess(): string[] {
        const unresolved: string[] = [];
        for (const [key, val] of Object.entries(process.env)) {
            if (typeof val === 'string' && val.trim().startsWith('op://')) {
                unresolved.push(key);
            }
        }
        return unresolved;
    }

    /**
     * Verifica si faltan variables de entorno esenciales para BotMaRe.
     */
    private hasMissingMandatoryEnv(): boolean {
        const mandatory = ['DASHBOARD_USER', 'DASHBOARD_PASS', 'SUPERADMIN_KEY', 'WEBHOOK_API_KEY', 'BACKUP_ENCRYPTION_KEY'];
        return mandatory.some(k => !process.env[k] || process.env[k]!.trim() === '');
    }

    /**
     * Realiza un chequeo de salud y diagnóstico seguro del proveedor activo (apto para mostrar en Telegram/Dashboard).
     * CERO EXPOSICIÓN de secretos reales.
     */
    public checkHealth(): SecretProviderHealth {
        const timestamp = new Date().toISOString();
        const cliAvailable = this.isOpCliAvailable();

        const mandatoryKeys = ['DASHBOARD_USER', 'DASHBOARD_PASS', 'SUPERADMIN_KEY', 'WEBHOOK_API_KEY', 'BACKUP_ENCRYPTION_KEY'];
        const missingMandatory = mandatoryKeys.filter(k => !process.env[k] || process.env[k]!.trim() === '' || process.env[k]!.startsWith('op://'));

        if (this.currentProvider === '1password') {
            if (!cliAvailable) {
                return {
                    status: 'error',
                    provider: '1password',
                    details: {
                        cliAvailable: false,
                        resolvedCount: mandatoryKeys.length - missingMandatory.length,
                        missingCount: missingMandatory.length,
                        source: '1Password CLI (No disponible en PATH)',
                        error: '1Password CLI no detectado en el servidor.'
                    },
                    timestamp
                };
            }

            if (this.initError) {
                return {
                    status: 'error',
                    provider: '1password',
                    details: {
                        cliAvailable: true,
                        resolvedCount: mandatoryKeys.length - missingMandatory.length,
                        missingCount: missingMandatory.length,
                        source: '1Password Secrets Manager',
                        error: this.initError
                    },
                    timestamp
                };
            }

            let vaultName = 'Detectando...';
            if (fs.existsSync(this.templatePath)) {
                try {
                    const content = fs.readFileSync(this.templatePath, 'utf8');
                    const match = content.match(/op:\/\/([^/]+)\//);
                    if (match && match[1]) vaultName = match[1];
                } catch {}
            }

            return {
                status: missingMandatory.length === 0 ? 'ok' : 'warning',
                provider: '1password',
                details: {
                    cliAvailable: true,
                    vaultName,
                    resolvedCount: mandatoryKeys.length - missingMandatory.length,
                    missingCount: missingMandatory.length,
                    source: '1Password Secrets Manager (op run / inject)',
                    error: missingMandatory.length > 0 ? `Faltan claves: ${missingMandatory.join(', ')}` : undefined
                },
                timestamp
            };
        }

        if (this.currentProvider === 'environment') {
            return {
                status: missingMandatory.length === 0 ? 'ok' : 'warning',
                provider: 'environment',
                details: {
                    resolvedCount: mandatoryKeys.length - missingMandatory.length,
                    missingCount: missingMandatory.length,
                    source: 'Variables del Sistema (process.env)',
                    error: missingMandatory.length > 0 ? `Faltan claves: ${missingMandatory.join(', ')}` : undefined
                },
                timestamp
            };
        }

        // dotenv
        const envExists = fs.existsSync(path.resolve(process.cwd(), '.env'));
        return {
            status: (envExists && missingMandatory.length === 0) ? 'ok' : 'warning',
            provider: 'dotenv',
            details: {
                resolvedCount: mandatoryKeys.length - missingMandatory.length,
                missingCount: missingMandatory.length,
                source: envExists ? 'Archivo .env Local' : 'Sin archivo .env detectado',
                error: !envExists ? 'Archivo .env no encontrado.' : (missingMandatory.length > 0 ? `Faltan: ${missingMandatory.join(', ')}` : undefined)
            },
            timestamp
        };
    }

    /**
     * Retorna el listado de referencias y fuentes sin exponer valores sensibles.
     */
    public getSecretReferencesInfo(): SecretReferenceInfo[] {
        const keysToCheck = [
            'DASHBOARD_USER',
            'DASHBOARD_PASS',
            'SUPERADMIN_KEY',
            'WEBHOOK_API_KEY',
            'BACKUP_ENCRYPTION_KEY',
            'GROQ_API_KEY',
            'GEMINI_API_KEY',
            'OPENAI_API_KEY',
            'DEEPSEEK_API_KEY',
            'TELEGRAM_BOT_TOKEN',
            'GITHUB_WEBHOOK_SECRET',
            'GITHUB_TOKEN',
            'HTTPSMS_API_KEY',
            'MONGO_URI'
        ];

        let templateMap: Record<string, string> = {};
        if (fs.existsSync(this.templatePath)) {
            try {
                templateMap = dotenv.parse(fs.readFileSync(this.templatePath, 'utf8'));
            } catch {}
        }

        return keysToCheck.map(key => {
            const hasEnv = !!(process.env[key] && process.env[key]!.trim() !== '' && !process.env[key]!.startsWith('op://'));
            const opRef = templateMap[key];

            let source: '1password' | 'env' | 'database' | 'missing' = 'missing';
            if (opRef && hasEnv && this.currentProvider === '1password') {
                source = '1password';
            } else if (hasEnv) {
                source = 'env';
            }

            return {
                key,
                reference: opRef || undefined,
                source,
                isSet: hasEnv
            };
        });
    }

    /**
     * Sanitiza mensajes de error para que nunca contengan tokens de servicio ni contraseñas.
     */
    public sanitizeErrorMessage(msg: string): string {
        return msg
            .replace(/ops_[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_OP_TOKEN]')
            .replace(/op:\/\/[^\s"'`]+/g, (match) => {
                const parts = match.split('/');
                return parts.length >= 3 ? `op://${parts[2]}/***/***` : 'op://***';
            })
            .replace(/(pass|key|secret|token)=["']?[^"'\s\n]+["']?/gi, '$1="[REDACTED]"');
    }
}

