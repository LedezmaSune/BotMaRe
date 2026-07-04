import { Router } from 'express';
import { crmService } from '../core/crm.service';

const router = Router();

router.get('/', (req, res) => {
    try {
        const contacts = crmService.getAllContacts();
        res.json(contacts);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

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
        res.status(500).json({ error: e.message });
    }
});

router.post('/untag', (req, res) => {
    try {
        const { id, tag } = req.body;
        crmService.removeTag(id, tag);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        crmService.deleteContact(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
