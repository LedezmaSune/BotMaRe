import { Router } from 'express';
import { crmService } from '../core/crm.service';

const router = Router();

// GET /api/crm - Obtiene todos los contactos, etiquetas y estadísticas
router.get('/', (req, res) => {
    try {
        const contacts = crmService.getAllContacts();
        const tags = crmService.getAllTags();
        const stats = crmService.getStats();
        res.json({
            success: true,
            contacts,
            tags,
            stats
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/crm/tags - Obtiene la lista de etiquetas
router.get('/tags', (req, res) => {
    try {
        const tags = crmService.getAllTags();
        res.json({ success: true, tags });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/tags - Crea una nueva etiqueta personalizada
router.post('/tags', (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'El nombre de la etiqueta es requerido' });
        }
        const newTag = crmService.createTag(name, color || '#8b5cf6');
        res.json({ success: true, tag: newTag });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/crm/tags/:id - Elimina una etiqueta
router.delete('/tags/:id', (req, res) => {
    try {
        crmService.deleteTag(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PUT /api/crm/tags/:id - Edita el nombre y color de una etiqueta
router.put('/tags/:id', (req, res) => {
    try {
        const { name, color } = req.body;
        const updated = crmService.updateTag(req.params.id, { name, color });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Etiqueta no encontrada' });
        }
        res.json({ success: true, tag: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/contact - Crea o actualiza un contacto
router.post('/contact', (req, res) => {
    try {
        const { id, name, pushName, phone, email, notes, tags, address, customFields } = req.body;
        const contactId = id || phone;
        if (!contactId) {
            return res.status(400).json({ success: false, error: 'Se requiere un ID o número de teléfono' });
        }

        const updated = crmService.updateContact(contactId, {
            name,
            pushName,
            phone: contactId,
            email,
            notes,
            tags,
            address,
            customFields
        });

        res.json({ success: true, contact: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/tag - Agrega una etiqueta a un contacto
router.post('/tag', (req, res) => {
    try {
        const { id, name, tag } = req.body;
        if (name) {
            crmService.updateContact(id, { name });
        }
        if (tag) {
            crmService.addTag(id, tag);
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/untag - Quita una etiqueta de un contacto
router.post('/untag', (req, res) => {
    try {
        const { id, tag } = req.body;
        crmService.removeTag(id, tag);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/bulk-tag - Asigna una etiqueta a múltiples contactos
router.post('/bulk-tag', (req, res) => {
    try {
        const { ids, tag } = req.body;
        if (Array.isArray(ids) && tag) {
            crmService.bulkTag(ids, tag);
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/bulk-untag - Quita una etiqueta de múltiples contactos
router.post('/bulk-untag', (req, res) => {
    try {
        const { ids, tag } = req.body;
        if (Array.isArray(ids) && tag) {
            crmService.bulkUntag(ids, tag);
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/bulk-delete - Elimina múltiples contactos
router.post('/bulk-delete', (req, res) => {
    try {
        const { ids } = req.body;
        if (Array.isArray(ids)) {
            crmService.bulkDelete(ids);
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/crm/import - Importa contactos masivamente
router.post('/import', (req, res) => {
    try {
        const { contacts } = req.body;
        if (!Array.isArray(contacts)) {
            return res.status(400).json({ success: false, error: 'Se esperaba un arreglo de contactos' });
        }
        const importedCount = crmService.importContacts(contacts);
        res.json({ success: true, count: importedCount });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/crm/:id - Elimina un contacto
router.delete('/:id', (req, res) => {
    try {
        crmService.deleteContact(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
