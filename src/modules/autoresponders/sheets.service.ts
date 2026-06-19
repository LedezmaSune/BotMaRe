import { google } from 'googleapis';
import * as dbManager from '../../core/dbManager';



export class GoogleSheetsService {
  
  private async fetchRows(): Promise<{ success: boolean; message?: string; rows?: string[][] }> {
    try {
      const settings = await dbManager.getSheetSyncSettings();

      if (!settings || !settings.spreadsheetId) {
        return { success: false, message: 'Falta el ID de la Hoja de Cálculo.' };
      }

      const authMethod = settings.authMethod || 'oauth';
      let rows: string[][] = [];
      const cleanSpreadsheetId = settings.spreadsheetId.trim();

      if (authMethod === 'public') {
        // Option A: Public Sheet using CSV Export
        const url = `https://docs.google.com/spreadsheets/d/${cleanSpreadsheetId}/export?format=csv`;
        const axios = require('axios');
        const axiosRes = await axios.get(url, { responseType: 'text', validateStatus: () => true });
        
        if (axiosRes.status !== 200) {
           return { success: false, message: `No se pudo acceder a la hoja pública. Código HTTP: ${axiosRes.status}. Verifica que el ID sea correcto y el enlace sea público.` };
        }
        const text = axiosRes.data;
        
        // CSV Parser robusto para soportar saltos de línea y comas dentro del texto
        const parsedRows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentCell += '"';
                    i++; // Saltar comilla escapada
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    currentCell += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentCell.trim());
                    currentCell = '';
                } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                    currentRow.push(currentCell.trim());
                    parsedRows.push(currentRow);
                    currentRow = [];
                    currentCell = '';
                    if (char === '\r') i++; 
                } else {
                    currentCell += char;
                }
            }
        }
        if (currentCell !== '' || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            parsedRows.push(currentRow);
        }

        rows = parsedRows;
      } else {
        let sheets;
        if (authMethod === 'service_account') {
          // Option B: Service Account JSON
          const path = require('path');
          const fs = require('fs');
          const keyPath = path.join(process.cwd(), 'data', 'credentials.json');
          if (!fs.existsSync(keyPath)) {
            return { success: false, message: 'No se encontró el archivo credentials.json de la Cuenta de Servicio.' };
          }
          const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          sheets = google.sheets({ version: 'v4', auth });
        } else {
          // Option C: OAuth 2.0 (Default)
          if (!settings.refreshToken) {
            return { success: false, message: 'No hay token de sesión OAuth. Inicia sesión con Google.' };
          }
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );
          oauth2Client.setCredentials({ refresh_token: settings.refreshToken });
          sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        }

        const meta = await sheets.spreadsheets.get({ spreadsheetId: cleanSpreadsheetId });
        const firstSheetName = meta.data.sheets?.[0]?.properties?.title;

        if (!firstSheetName) {
          return { success: false, message: 'No se pudo leer la estructura de la hoja de cálculo.' };
        }

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: cleanSpreadsheetId,
          range: `${firstSheetName}!A:C`, // <-- Fetching A:C
        });

        rows = response.data.values || [];
      }

      if (!rows || rows.length === 0) {
        return { success: false, message: 'La hoja de cálculo está vacía.' };
      }

      return { success: true, rows };
    } catch (error: any) {
      console.error('❌ Error al acceder a Google Sheets:', error);
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  /**
   * Sincroniza la base de datos local con los datos de Google Sheets
   */
  async syncNow(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const settings = await dbManager.getSheetSyncSettings();

      if (!settings || !settings.isActive) {
        return { success: false, message: 'Google Sheets no está configurado o está desactivado globalmente.' };
      }

      const result = await this.fetchRows();
      if (!result.success || !result.rows) {
        return { success: false, message: result.message || 'Error desconocido' };
      }

      const rows = result.rows;

      // Borramos TODAS las auto-respuestas anteriores que provengan de Google Sheets
      await this.cleanSynced();

      // Iteramos e insertamos las nuevas (Saltando la primera fila si parece un encabezado)
      let importedCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const keyword = rows[i][0]?.trim();
        const reply = rows[i][1]?.trim();
        const matchCol = rows[i][2]?.trim();

        // Ignoramos filas si falta alguna de las 3 columnas
        if (!keyword || !reply || !matchCol) continue;
        if (i === 0 && keyword.toLowerCase().includes('palabra')) continue;

        const matchType = matchCol === '2' ? 'contains' : 'exact';

        // Insertamos en Lowdb
        await dbManager.createAutoresponder(
          keyword,
          matchType, 
          reply,
          'menu_only', // 'menu_only' significa que se enviará la respuesta directamente sin pasar por la IA
          true, // isActive
          null,
          'sheets_synced' // Etiqueta para identificarlos
        );
        importedCount++;
      }

      // Actualizamos la fecha de última sincronización
      settings.lastSyncTime = new Date();
      await dbManager.saveSheetSyncSettings(settings);

      return { success: true, message: `Sincronización exitosa.`, count: importedCount };

    } catch (error: any) {
      console.error('❌ Error al sincronizar Google Sheets:', error);
      return { success: false, message: `Error de API: ${error.message}` };
    }
  }

  /**
   * Obtiene una vista previa de los datos sin guardarlos en la base de datos
   */
  async previewSync(): Promise<{ success: boolean; message?: string; preview?: any[] }> {
    const result = await this.fetchRows();
    if (!result.success || !result.rows) {
      return { success: false, message: result.message };
    }

    const preview = [];
    let count = 0;
    for (let i = 0; i < result.rows.length; i++) {
      const keyword = result.rows[i][0]?.trim();
      const reply = result.rows[i][1]?.trim();
      const matchCol = result.rows[i][2]?.trim();

      // Ignoramos si falta alguna columna
      if (!keyword || !reply || !matchCol) continue;
      if (i === 0 && keyword.toLowerCase().includes('palabra')) continue;

      const matchType = matchCol === '2' ? 'Contiene (2)' : 'Exacta (1)';

      preview.push({ keyword, reply, matchType });
      count++;
      if (count >= 200) break; // Mostramos hasta 200
    }

    return { success: true, preview };
  }

  /**
   * Elimina todas las auto-respuestas generadas por Google Sheets
   */
  async cleanSynced(): Promise<{ success: boolean; message: string }> {
    try {
      const allResponders = await dbManager.listAutoresponders();
      for (const ar of allResponders) {
        if (ar.options === 'sheets_synced') {
          await dbManager.deleteAutoresponder(ar.id);
        }
      }
      return { success: true, message: 'Se eliminaron todas las respuestas sincronizadas de Google Sheets.' };
    } catch (error: any) {
      return { success: false, message: `Error al limpiar: ${error.message}` };
    }
  }
}
