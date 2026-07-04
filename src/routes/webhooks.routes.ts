import { Router } from 'express';

const router = Router();

// ==========================================
// MÓDULO EN CONSTRUCCIÓN (V2 ENTERPRISE)
// ==========================================

router.post('/incoming', (req, res) => {
    // Aquí se recibirán los webhooks de Zapier / Make en el futuro
    console.log('[Webhooks] Solicitud recibida, pero el módulo está en construcción.');
    res.status(200).json({ status: 'success', message: 'Webhooks feature is currently under construction. Please check back later.' });
});

router.get('/status', (req, res) => {
    res.status(200).json({ status: 'under_construction', active: false });
});

export default router;
