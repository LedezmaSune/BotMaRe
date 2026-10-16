import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import * as dbManager from '../../core/dbManager';
import { GoogleSheetsService } from './sheets.service';

export function createSheetsRouter() {
    const router = Router();
    const sheetsService = new GoogleSheetsService();

    const getOAuth2Client = (req?: any) => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        let redirectUrl = process.env.GOOGLE_REDIRECT_URI;
        if (!redirectUrl && req) {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.get('host');
            redirectUrl = `${protocol}://${host}/api/sheets/auth/callback`;
        } else if (!redirectUrl) {
            redirectUrl = 'http://localhost:8000/api/sheets/auth/callback';
        }
        
        return new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
    };

    router.get('/auth/login', (req, res) => {
        const oauth2Client = getOAuth2Client(req);
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });
        res.redirect(url);
    });

    router.get('/auth/callback', async (req, res) => {
        try {
            const { code } = req.query;
            const oauth2Client = getOAuth2Client(req);
            const { tokens } = await oauth2Client.getToken(code as string);
            
            let settings = await dbManager.getSheetSyncSettings() || {} as any;
            settings.refreshToken = tokens.refresh_token || settings.refreshToken;
            await dbManager.saveSheetSyncSettings(settings);

            // Redirect back to dashboard modal
            res.redirect('/?sheets_auth=success');
        } catch (error) {
            res.redirect('/?sheets_auth=error');
        }
    });

    router.get('/settings', async (req, res) => {
        try {
            const settings: any = (await dbManager.getSheetSyncSettings()) || {};
            const { refreshToken, ...safeSettings } = settings;

            // Verificar si existe cuenta de servicio configurada sin exponer private_key
            const credPath = path.join(process.cwd(), 'data', 'credentials.json');
            let hasPrivateKey = false;
            let clientEmail = '';
            if (fs.existsSync(credPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
                    hasPrivateKey = !!creds.private_key;
                    clientEmail = creds.client_email || '';
                } catch {}
            }

            res.json({
                ...safeSettings,
                hasToken: !!refreshToken,
                hasPrivateKey,
                clientEmail: clientEmail || (safeSettings as any).clientEmail
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/settings', async (req, res) => {
        try {
            let current = await dbManager.getSheetSyncSettings();
            let refreshToken = current?.refreshToken || '';

            if (req.body.refreshToken === null || req.body.refreshToken === '') {
                refreshToken = '';
            } else if (req.body.refreshToken && typeof req.body.refreshToken === 'string' && !req.body.refreshToken.startsWith('•••')) {
                refreshToken = req.body.refreshToken;
            }

            const newSettings = {
                spreadsheetId: req.body.spreadsheetId !== undefined ? req.body.spreadsheetId : (current?.spreadsheetId || ''),
                refreshToken,
                syncInterval: req.body.syncInterval || current?.syncInterval || 'manual',
                isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : !!current?.isActive,
                lastSyncTime: current?.lastSyncTime,
                authMethod: req.body.authMethod || current?.authMethod || 'oauth'
            };
            await dbManager.saveSheetSyncSettings(newSettings);

            // Sincronización automática de fondo si el módulo está activado y tiene ID
            if (newSettings.isActive && newSettings.spreadsheetId) {
                sheetsService.syncNow().catch((err: any) => {
                    console.warn('[SheetsRouter] Sincronización automática de fondo falló:', err.message);
                });
            }

            const { refreshToken: _token, ...safeResponse } = newSettings;
            res.json({
                ...safeResponse,
                hasToken: !!refreshToken
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/upload-credentials', async (req, res) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const credentials = req.body;
            
            if (!credentials || !credentials.client_email || !credentials.private_key) {
                return res.status(400).json({ error: 'JSON de credenciales inválido.' });
            }

            const dataPath = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataPath)) {
                fs.mkdirSync(dataPath, { recursive: true });
            }

            fs.writeFileSync(path.join(dataPath, 'credentials.json'), JSON.stringify(credentials, null, 2));

            let current = await dbManager.getSheetSyncSettings();
            const newSettings: any = current || {
                spreadsheetId: '',
                refreshToken: '',
                syncInterval: 'manual',
                isActive: false
            };
            newSettings.authMethod = 'service_account';
            await dbManager.saveSheetSyncSettings(newSettings);

            res.json({ success: true, message: 'Credenciales guardadas correctamente.' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/sync', async (req, res) => {
        try {
            const result = await sheetsService.syncNow();
            if (result.success) res.json(result);
            else res.status(400).json(result);
        } catch (error: any) {
            console.error('Error al sincronizar:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/preview', async (req, res) => {
        try {
            const result = await sheetsService.previewSync();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.delete('/clean', async (req, res) => {
        try {
            const result = await sheetsService.cleanSynced();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
