import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getSettings, updateSettings, listReminders } from '../../core/memory';
import { asyncHandler } from '../../middleware/errorHandler';
import { scrapeUrl } from '../../core/scraper';
import { getAllConfig, getSafePublicConfig } from '../../core/config';

const uploadDir = path.resolve('data/uploads');

// Claves críticas de seguridad bloqueadas en el endpoint general /api/settings
export const BLOCKED_SETTINGS_KEYS = new Set([
    'WHATSAPP_OWNER_NUMBER',
    'DASHBOARD_USER',
    'DASHBOARD_PASS',
    'SUPERADMIN_KEY',
    'BACKUP_ENCRYPTION_KEY',
    'WEBHOOK_API_KEY',
    'GITHUB_WEBHOOK_SECRET',
    'GITHUB_TOKEN'
]);

// Allowlist de claves que pueden ser modificadas desde la interfaz de ajustes
export const WRITABLE_SETTINGS_KEYS = new Set([
    'bot_name',
    'system_prompt',
    'possible_responses',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'NVIDIA_API_KEY',
    'OPENROUTER_API_KEY',
    'DEEPSEEK_API_KEY',
    'CEREBRAS_API_KEY',
    'SAMBANOVA_API_KEY',
    'MISTRAL_API_KEY',
    'SILICONFLOW_API_KEY',
    'TOGETHER_API_KEY',
    'CHEAPERINFERENCE_API_KEY',
    'OLLAMA_API_KEY',
    'OLLAMA_API_URL',
    'OLLAMA_MODEL',
    'GROQ_MODEL',
    'CEREBRAS_MODEL',
    'SAMBANOVA_MODEL',
    'SILICONFLOW_MODEL',
    'MISTRAL_MODEL',
    'TOGETHER_MODEL',
    'GEMINI_MODEL',
    'OPENAI_MODEL',
    'NVIDIA_MODEL',
    'OPENROUTER_MODEL',
    'DEEPSEEK_MODEL',
    'CHEAPERINFERENCE_MODEL',
    'AI_ENABLED',
    'AUTORESPONDERS_ENABLED',
    'ENABLE_GROUPS',
    'ALLOWED_GROUPS',
    'NOTIFY_MODELS_TELEGRAM',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ALLOWED_USER_IDS',
    'HTTPSMS_API_KEY',
    'HTTPSMS_FROM_NUMBER',
    'HTTPSMS_API_URL',
    'PORT',
    'AUTO_DEPLOY'
]);

// Variables de entorno de seguridad obligatorias para un .env válido
const MANDATORY_ENV_VARS = [
    'DASHBOARD_USER',
    'DASHBOARD_PASS',
    'SUPERADMIN_KEY',
    'WEBHOOK_API_KEY',
    'BACKUP_ENCRYPTION_KEY'
];

const AI_PROVIDERS = [
    'GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'NVIDIA_API_KEY',
    'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'CEREBRAS_API_KEY',
    'SAMBANOVA_API_KEY', 'MISTRAL_API_KEY', 'SILICONFLOW_API_KEY',
    'TOGETHER_API_KEY', 'CHEAPERINFERENCE_API_KEY', 'OLLAMA_API_URL'
];

export class SettingsController {
    constructor(private waClient?: any) {}

    getSettings = asyncHandler(async (req: Request, res: Response) => {
        // Devuelve únicamente configuración segura con secretos enmascarados
        const safeSettings = await getSafePublicConfig();
        res.json(safeSettings);
    });

    updateSettings = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body || {};

        // 1. Bloquear estrictamente modificaciones a variables sensibles de seguridad
        for (const blockedKey of BLOCKED_SETTINGS_KEYS) {
            if (body[blockedKey] !== undefined) {
                return res.status(400).json({
                    success: false,
                    error: `No está permitido modificar la variable de seguridad '${blockedKey}' mediante este endpoint.`
                });
            }
        }

        // 2. Filtrar únicamente las claves autorizadas y descartar máscaras
        const cleanToUpdate: Record<string, any> = {};
        for (const [key, value] of Object.entries(body)) {
            if (!WRITABLE_SETTINGS_KEYS.has(key)) {
                continue;
            }
            if (typeof value === 'string' && value.startsWith('••••')) {
                // Si el valor recibido es la máscara visual, no sobreescribir el secreto real
                continue;
            }
            cleanToUpdate[key] = value;
        }

        await updateSettings(cleanToUpdate);
        
        // Sincronizar el nombre del bot con el perfil de WhatsApp si está conectado
        if (cleanToUpdate.bot_name && this.waClient) {
            try {
                const socket = this.waClient.getSocket?.();
                if (socket && typeof socket.updateProfileName === 'function') {
                    console.log(`[SettingsController] Actualizando nombre de perfil de WhatsApp a: ${cleanToUpdate.bot_name}`);
                    await socket.updateProfileName(cleanToUpdate.bot_name);
                }
            } catch (e: any) {
                console.error('[SettingsController] Error al sincronizar el nombre de perfil de WhatsApp:', e.message);
            }
        }
        
        res.json({ success: true });
    });

    parseEnvFile = asyncHandler(async (req: Request, res: Response) => {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ success: false, error: "El contenido del archivo .env es requerido." });
        }

        const lines = content.split(/\r?\n/);
        const parsed: Record<string, string> = {};
        
        // 1. Validar el formato de cada línea
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;
            
            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) {
                return res.status(400).json({
                    success: false,
                    error: `Formato inválido en línea ${i + 1}: "${line}". Debe tener formato CLAVE=VALOR.`
                });
            }

            const key = line.substring(0, eqIndex).trim();
            const val = line.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '');

            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                return res.status(400).json({
                    success: false,
                    error: `Nombre de variable inválido en línea ${i + 1}: "${key}".`
                });
            }

            parsed[key] = val;
        }

        // 2. Validar que las variables obligatorias de seguridad no falten ni estén vacías
        const missingMandatory = MANDATORY_ENV_VARS.filter(k => !parsed[k] || parsed[k].trim() === '');
        if (missingMandatory.length > 0) {
            return res.status(400).json({
                success: false,
                error: `El archivo .env fue rechazado. Faltan variables obligatorias de seguridad: ${missingMandatory.join(', ')}.`
            });
        }

        // 3. Validar al menos un proveedor de IA
        const hasAi = AI_PROVIDERS.some(k => parsed[k] && parsed[k].trim() !== '');
        if (!hasAi) {
            return res.status(400).json({
                success: false,
                error: `El archivo .env fue rechazado. Debe configurar al menos un proveedor de IA (${AI_PROVIDERS.join(', ')}).`
            });
        }

        // 4. Crear copia de seguridad del .env previo antes de sobreescribir
        const envPath = path.resolve(process.cwd(), '.env');
        try {
            if (fs.existsSync(envPath)) {
                const backupPath = path.resolve(process.cwd(), '.env.backup');
                fs.copyFileSync(envPath, backupPath);
            }
        } catch (e: any) {
            console.error("[SettingsController] Error creando respaldo de .env previo:", e.message);
        }

        // 5. Sobreescribir el archivo .env físico
        try {
            fs.writeFileSync(envPath, content, 'utf8');
        } catch (e: any) {
            console.error("[SettingsController] Error escribiendo el archivo .env físico:", e.message);
            return res.status(500).json({ success: false, error: "Error al escribir el archivo .env en disco." });
        }

        // 6. Inyectar dinámicamente en process.env
        for (const [cleanKey, value] of Object.entries(parsed)) {
            process.env[cleanKey] = value;
        }

        // 7. Actualizar la base de datos
        await updateSettings(parsed);
        res.json({ success: true, count: Object.keys(parsed).length, message: ".env validado, respaldado y actualizado en disco y memoria" });
    });

    testLLM = asyncHandler(async (req: Request, res: Response) => {
        const { runLLMDiagnostic } = await import('../../core/llmTest');
        const result = await runLLMDiagnostic();
        res.json(result);
    });

    cleanUploads = asyncHandler(async (req: Request, res: Response) => {
        const uploadDir = path.resolve('data/uploads');
        if (!fs.existsSync(uploadDir)) return res.json({ success: true, deletedCount: 0 });
        
        const files = fs.readdirSync(uploadDir);
        const { listAllPendingReminders } = require('../../core/memory');
        const pendingReminders = await listAllPendingReminders();
        
        const activePaths = new Set(pendingReminders.map((r: any) => r.mediaPath).filter(Boolean));
        
        let count = 0;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        files.forEach(file => {
            const p = path.join(uploadDir, file);
            const stats = fs.statSync(p);
            // Delete if not active AND older than 1 day
            if (!activePaths.has(p) && (now - Math.max(stats.mtimeMs, stats.ctimeMs) > oneDayMs)) {
                try {
                    fs.unlinkSync(p);
                    count++;
                } catch(e) {}
            }
        });

        res.json({ success: true, deletedCount: count });
    });
    learnFromUrl = asyncHandler(async (req: Request, res: Response) => {
        const { url } = req.body;
        if (!url) throw new Error("URL is required");

        const content = await scrapeUrl(url);
        
        // Fetch current knowledge or possible responses
        const settings = await getSettings() as any;
        const currentKnowledge = settings.possible_responses || "";
        
        const newKnowledge = `${currentKnowledge}\n\n[CONOCIMIENTO DE ${url}]:\n${content}`;
        
        await updateSettings({ possible_responses: newKnowledge });
        
        res.json({ success: true, learnedCount: content.length });
    });
}

