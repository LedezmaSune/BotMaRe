import { Request, Response } from 'express';
import { listTemplates, createTemplate, deleteTemplate, updateTemplate } from '../../core/db';
import { asyncHandler } from '../../middleware/errorHandler';

export class TemplateController {
    list = asyncHandler(async (req: Request, res: Response) => {
        const templates = await listTemplates();
        res.json(templates);
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const { name, content } = req.body;
        if (!name || !content) return res.status(400).json({ error: 'Name and content are required' });
        const id = await createTemplate(name, content);
        res.json({ success: true, id });
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, content } = req.body;
        await updateTemplate(Number(id), name, content);
        res.json({ success: true });
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        await deleteTemplate(Number(id));
        res.json({ success: true });
    });
}
