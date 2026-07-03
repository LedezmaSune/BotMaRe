import { Router } from 'express';
import { accessControl } from '../core/accessControl';
import { basicAuth } from '../middleware/auth.middleware';

const router = Router();

// Todos los endpoints están protegidos por el dashboard auth
router.use(basicAuth);

router.get('/', (req, res) => {
    try {
        const config = accessControl.getConfig();
        res.json(config);
    } catch (error) {
        console.error('[AccessRoutes] Error obteniendo config:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Este endpoint permite enviar comandos como si fueran desde WA (ej: "!lista contactos mode whitelist")
router.post('/command', (req, res) => {
    try {
        const { target, action, value } = req.body; 
        // target: 'contactos' | 'grupos'
        // action: 'mode' | 'add' | 'ban' | 'remove'
        // value: string (numero, ID, o 'all', etc)

        if (!target || !action || !value) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos' });
        }

        const isGroup = target === 'grupos';
        const waCommand = `!lista ${action} ${value}`;
        
        const response = accessControl.processAdminCommand(waCommand, isGroup);
        
        res.json({ message: response, config: accessControl.getConfig() });
    } catch (error) {
        console.error('[AccessRoutes] Error procesando comando:', error);
        res.status(500).json({ error: 'Error procesando comando' });
    }
});

export default router;
