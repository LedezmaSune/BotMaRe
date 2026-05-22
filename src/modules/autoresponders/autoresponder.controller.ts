import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import {
    listAutoresponders,
    createAutoresponder,
    updateAutoresponder,
    deleteAutoresponder,
    toggleAutoresponder
} from '../../core/memory';

export class AutoresponderController {
    list = asyncHandler(async (req: Request, res: Response) => {
        const rules = await listAutoresponders();
        res.json(rules);
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const { keyword, matchType, response, aiAction, isActive } = req.body;
        const id = await createAutoresponder(keyword, matchType, response, aiAction, isActive);
        res.json({ success: true, id });
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { keyword, matchType, response, aiAction, isActive } = req.body;
        await updateAutoresponder(Number(id), keyword, matchType, response, aiAction, isActive);
        res.json({ success: true });
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        await deleteAutoresponder(Number(id));
        res.json({ success: true });
    });

    toggle = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { isActive } = req.body;
        await toggleAutoresponder(Number(id), isActive);
        res.json({ success: true });
    });
}
