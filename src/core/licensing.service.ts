import { getSettings, updateSettings } from './memory';
import { ModuleDefinition, PlanType, ALL_MODULES, PLAN_PRESETS } from '../types/licensing';

export type { ModuleDefinition, PlanType };
export { ALL_MODULES, PLAN_PRESETS };

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
