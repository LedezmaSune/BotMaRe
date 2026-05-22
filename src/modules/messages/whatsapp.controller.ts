import { Request, Response } from 'express';
import { MessageService } from './message.service';
import { asyncHandler } from '../../middleware/errorHandler';

export class WhatsAppController {
    constructor(private waService: MessageService) {}

    getStatus = asyncHandler(async (req: Request, res: Response) => {
        const status = this.waService.getStatus();
        res.json(status);
    });

    sendMessage = asyncHandler(async (req: Request, res: Response) => {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({ success: false, error: "To and Message are required" });
        }
        await this.waService.sendMessage(to, message);
        res.json({ success: true });
    });

    disconnect = asyncHandler(async (req: Request, res: Response) => {
        await this.waService.disconnect();
        res.json({ success: true });
    });

    getGroups = asyncHandler(async (req: Request, res: Response) => {
        const groups = await this.waService.getGroups();
        res.json(Object.values(groups));
    });

    requestPairingCode = asyncHandler(async (req: Request, res: Response) => {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ success: false, error: "Phone number is required" });
        }
        
        // Limpiar el número de cualquier caracter no numérico
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        try {
            const code = await this.waService.requestPairingCode(cleanNumber);
            res.json({ success: true, code });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message || "Error requesting pairing code" });
        }
    });
}
