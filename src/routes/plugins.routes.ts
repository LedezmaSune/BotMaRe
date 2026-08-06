import { Router } from 'express';
import { PluginService } from '../modules/plugins/plugin.service';

export function createPluginsRouter() {
    const router = Router();
    const pluginService = PluginService.getInstance();

    // GET /api/plugins
    // Obtiene la lista de todos los plugins y sus metadatos
    router.get('/', (req, res) => {
        try {
            const plugins = pluginService.getPlugins();
            res.json({ success: true, plugins });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // POST /api/plugins
    // Crea o actualiza un plugin con nuevo código
    router.post('/', (req, res) => {
        try {
            const { id, code } = req.body;
            if (!id || !code) {
                return res.status(400).json({ success: false, error: 'Se requiere ID y código' });
            }

            pluginService.savePlugin(id, code);
            res.json({ success: true, message: 'Plugin guardado exitosamente' });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // POST /api/plugins/toggle
    // Activa o desactiva un plugin
    router.post('/toggle', (req, res) => {
        try {
            const { id, active } = req.body;
            if (!id || typeof active !== 'boolean') {
                return res.status(400).json({ success: false, error: 'Se requiere ID y estado active' });
            }

            pluginService.togglePlugin(id, active);
            res.json({ success: true, message: `Plugin ${active ? 'activado' : 'desactivado'}` });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // DELETE /api/plugins/:id
    router.delete('/:id', (req, res) => {
        try {
            const id = req.params.id;
            pluginService.deletePlugin(id);
            res.json({ success: true, message: 'Plugin eliminado' });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
