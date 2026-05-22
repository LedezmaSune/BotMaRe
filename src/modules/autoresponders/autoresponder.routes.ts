import { Router } from 'express';
import { AutoresponderController } from './autoresponder.controller';

export function createAutoresponderRouter(controller: AutoresponderController) {
    const router = Router();

    router.get('/', controller.list);
    router.post('/', controller.create);
    router.patch('/:id', controller.update);
    router.delete('/:id', controller.delete);
    router.patch('/:id/toggle', controller.toggle);

    return router;
}
