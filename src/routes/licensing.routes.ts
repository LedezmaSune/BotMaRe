import { Router, Request, Response } from 'express';
import { LicensingService, PlanType } from '../core/licensing.service';

export function createLicensingRouter(): Router {
    const router = Router();
    const service = LicensingService.getInstance();

    // Obtener estado público de módulos activos (para renderizado dinámico en frontend)
    router.get('/modules', async (_req: Request, res: Response) => {
        try {
            const state = await service.getLicensingState();
            res.json(state);
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Error al obtener estado de módulos' });
        }
    });

    // Validar clave maestra para abrir el panel SuperAdmin
    router.post('/verify', (req: Request, res: Response) => {
        try {
            const { masterKey } = req.body;
            if (!masterKey) {
                return res.status(400).json({ success: false, message: 'La clave maestra es requerida' });
            }

            const isValid = service.verifyMasterKey(masterKey);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Clave maestra incorrecta' });
            }

            res.json({ success: true, message: 'Autenticado correctamente como SuperAdmin' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Guardar cambios de módulos y plan (protegido por clave maestra)
    router.post('/update', async (req: Request, res: Response) => {
        try {
            const { masterKey, plan, modules } = req.body;

            if (!masterKey || !service.verifyMasterKey(masterKey)) {
                return res.status(401).json({ success: false, message: 'No autorizado: Clave maestra inválida' });
            }

            if (!plan) {
                return res.status(400).json({ success: false, message: 'El plan es requerido' });
            }

            const success = await service.updateLicensingState(plan as PlanType, modules || []);
            if (!success) {
                return res.status(500).json({ success: false, message: 'No se pudo guardar la configuración en la base de datos' });
            }

            const updatedState = await service.getLicensingState();
            res.json({ success: true, message: 'Plan y módulos actualizados con éxito', ...updatedState });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
}
