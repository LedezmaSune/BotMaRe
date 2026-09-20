import { getSettings, updateSettings } from './memory';

export interface ModuleDefinition {
    id: string;
    label: string;
    description: string;
    path: string;
    category: 'marketing' | 'automation' | 'ai' | 'management' | 'system';
}

export type PlanType = 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

export const ALL_MODULES: ModuleDefinition[] = [
    { id: 'mass', label: 'Difusión Masiva', description: 'Envíos masivos a contactos y listas personalizadas', path: '/', category: 'marketing' },
    { id: 'scheduling', label: 'Recordatorios', description: 'Programación de mensajes automáticos y recordatorios', path: '/scheduling', category: 'automation' },
    { id: 'calendar', label: 'Calendario', description: 'Vista mensual interactiva de recordatorios', path: '/calendar', category: 'automation' },
    { id: 'templates', label: 'Plantillas', description: 'Biblioteca de plantillas con variables dinámicas', path: '/templates', category: 'marketing' },
    { id: 'autoresponders', label: 'Menús Rápidos', description: 'Flujos de auto-respuestas interactivas con menús', path: '/autoresponders', category: 'automation' },
    { id: 'groups', label: 'Grupos', description: 'Gestión y escaneo de grupos de WhatsApp', path: '/groups', category: 'marketing' },
    { id: 'personality', label: 'Cerebro IA', description: 'Configuración de personalidad, prompts y modelos de IA en la nube', path: '/personality', category: 'ai' },
    { id: 'ollama', label: 'IA Local (Ollama)', description: 'Modelos de lenguaje ejecutados localmente sin internet', path: '/ollama', category: 'ai' },
    { id: 'access', label: 'Listas de Acceso', description: 'Control de listas blancas y negras de usuarios', path: '/access', category: 'management' },
    { id: 'support', label: 'Soporte', description: 'Monitor y herramientas de asistencia técnica', path: '/support', category: 'system' },
    { id: 'crm', label: 'CRM y Etiquetas', description: 'Etiquetado de clientes y seguimiento de estados', path: '/crm', category: 'management' },
    { id: 'sheets', label: 'Google Sheets', description: 'Integración y sincronización de datos con hojas de cálculo', path: '/sheets', category: 'automation' },
    { id: 'plugins', label: 'Plugins JS', description: 'Extensiones y scripts personalizados en JavaScript', path: '/plugins', category: 'system' },
    { id: 'webhooks', label: 'Webhooks', description: 'Integraciones salientes y entrantes vía HTTP', path: '/webhooks', category: 'automation' },
    { id: 'settings', label: 'Configuración', description: 'Ajustes del bot, credenciales y opciones de servidor', path: '/settings', category: 'system' },
    { id: 'audits', label: 'Auditoría', description: 'Registro detallado de acciones y seguridad', path: '/audits', category: 'system' },
    { id: 'updates', label: 'Actualizaciones', description: 'Verificación y despliegue de nuevas versiones', path: '/updates', category: 'system' },
    { id: 'telemetry', label: 'Telemetría', description: 'Métricas de rendimiento, memoria y uso de CPU', path: '/telemetry', category: 'system' },
    { id: 'manual', label: 'Manual de Uso', description: 'Guía y documentación interactiva del sistema', path: '/manual', category: 'system' }
];

export const PLAN_PRESETS: Record<Exclude<PlanType, 'CUSTOM'>, string[]> = {
    STARTER: ['mass', 'templates', 'autoresponders', 'groups', 'manual', 'settings'],
    PRO: ['mass', 'templates', 'autoresponders', 'groups', 'scheduling', 'calendar', 'crm', 'access', 'support', 'manual', 'settings'],
    ENTERPRISE: ALL_MODULES.map(m => m.id)
};

export class LicensingService {
    private static instance: LicensingService;

    public static getInstance(): LicensingService {
        if (!LicensingService.instance) {
            LicensingService.instance = new LicensingService();
        }
        return LicensingService.instance;
    }

    /**
     * Valida si la clave maestra de SuperAdmin coincide
     */
    public verifyMasterKey(key: string): boolean {
        const configuredKey = process.env.SUPERADMIN_KEY || 'botmare_admin';
        return !!key && key.trim() === configuredKey.trim();
    }

    /**
     * Obtiene el plan actual y la lista de módulos habilitados
     */
    public async getLicensingState(): Promise<{ plan: PlanType; enabledModules: string[]; allModules: ModuleDefinition[] }> {
        try {
            const settings = await getSettings();
            let plan: PlanType = (settings?.CURRENT_PLAN as PlanType) || 'ENTERPRISE';
            let enabledModules: string[] = [];

            if (settings?.ENABLED_MODULES) {
                try {
                    enabledModules = JSON.parse(settings.ENABLED_MODULES);
                } catch {
                    enabledModules = settings.ENABLED_MODULES.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
            } else {
                // Si no hay configuración previa, por defecto todo está habilitado (Plan Enterprise)
                enabledModules = ALL_MODULES.map(m => m.id);
            }

            // Asegurar que módulos esenciales mínimos no se queden vacíos
            if (!enabledModules || enabledModules.length === 0) {
                enabledModules = PLAN_PRESETS.STARTER;
            }

            return {
                plan,
                enabledModules,
                allModules: ALL_MODULES
            };
        } catch (error) {
            console.error('[LicensingService] Error al obtener estado de licencia:', error);
            // Fallback seguro: Todo activo
            return {
                plan: 'ENTERPRISE',
                enabledModules: ALL_MODULES.map(m => m.id),
                allModules: ALL_MODULES
            };
        }
    }

    /**
     * Actualiza el plan y los módulos activos
     */
    public async updateLicensingState(plan: PlanType, modules: string[]): Promise<boolean> {
        try {
            let modulesToSave = modules;
            if (plan !== 'CUSTOM' && PLAN_PRESETS[plan]) {
                modulesToSave = PLAN_PRESETS[plan];
            }

            // Asegurar que siempre se incluyan módulos vitales si es necesario
            if (!modulesToSave.includes('settings')) {
                modulesToSave.push('settings');
            }

            await updateSettings({
                CURRENT_PLAN: plan,
                ENABLED_MODULES: JSON.stringify(modulesToSave)
            });

            return true;
        } catch (error) {
            console.error('[LicensingService] Error al guardar estado de licencia:', error);
            return false;
        }
    }
}
