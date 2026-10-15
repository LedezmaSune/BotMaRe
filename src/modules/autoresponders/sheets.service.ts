import { google } from 'googleapis';
import * as dbManager from '../../core/dbManager';

export interface ParsedSheetRow {
  keyword: string;
  reply: string;
  matchType: 'contains' | 'exact';
  fileUrl: string | null;
}

/**
 * Extrae el Spreadsheet ID y el GID (pestaña) si el usuario ingresó una URL completa o con parámetros
 */
export function extractSheetInfo(rawInput: string): { spreadsheetId: string; gid?: string } {
  if (!rawInput) return { spreadsheetId: '' };
  const trimmed = rawInput.trim();

  // Extraer gid si viene en el enlace (#gid=12345 o ?gid=12345)
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/i);
  const gid = gidMatch ? gidMatch[1] : undefined;

  // Extraer spreadsheetId de enlaces docs.google.com/spreadsheets/d/ID/...
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (idMatch && idMatch[1]) {
    return { spreadsheetId: idMatch[1], gid };
  }

  // Si viene solo el ID o con parámetros anexos
  const cleanId = trimmed.split('/')[0].split('?')[0].split('#')[0].trim();
  return { spreadsheetId: cleanId, gid };
}

/**
 * Determina si una fila parece ser el encabezado de la hoja de cálculo
 */
function isHeaderRow(row: string[]): boolean {
  if (!row || row.length === 0) return false;
  const col0 = (row[0] || '').toLowerCase().trim();
  const col1 = (row[1] || '').toLowerCase().trim();
  return col0.includes('palabra') || 
         col0.includes('keyword') || 
         col0.includes('disparador') || 
         col0.includes('pregunta') || 
         col0 === 'columna a' || 
         col1.includes('respuesta') || 
         col1 === 'columna b';
}

/**
 * Parsea una fila de Google Sheets de forma flexible (soporta 2, 3 o 4 columnas)
 */
function parseRow(row: string[]): ParsedSheetRow | null {
  if (!row || row.length < 2) return null;
  const col0 = row[0]?.trim();
  const col1 = row[1]?.trim();
  const col2 = row[2]?.trim() || '';
  const col3 = row[3]?.trim() || '';

  // Se requiere al menos palabra clave y respuesta
  if (!col0 || !col1) return null;

  const isUrlOrMediaTag = (val: string) => {
    if (!val) return false;
    return /^https?:\/\//i.test(val) || 
           val.includes('drive.google.com') || 
           val.includes('docs.google.com') || 
           /^\[(IMG|DOC|VIDEO|AUDIO|MEDIA):/i.test(val);
  };

  let matchType: 'contains' | 'exact' = 'contains';
  let fileUrl: string | null = null;

  if (isUrlOrMediaTag(col2) && !col3) {
    // Caso: Hoja de 3 columnas (Col A: Keyword, Col B: Respuesta, Col C: Archivo)
    fileUrl = col2;
    matchType = 'contains';
  } else {
    // Caso estándar: Col C es tipo de coincidencia (1 = exacta, 2 = contiene)
    const cLower = col2.toLowerCase();
    if (cLower === '1' || cLower.includes('exact') || cLower === 'igual') {
      matchType = 'exact';
    } else {
      // Por defecto o si es '2', 'contiene', 'parcial', o está vacía: contiene
      matchType = 'contains';
    }

    if (col3) {
      fileUrl = col3;
    } else if (isUrlOrMediaTag(col2)) {
      fileUrl = col2;
    }
  }

  return {
    keyword: col0,
    reply: col1,
    matchType,
    fileUrl: fileUrl || null
  };
}

export class GoogleSheetsService {
  
  private async fetchRows(): Promise<{ success: boolean; message?: string; rows?: string[][] }> {
    try {
      const settings = await dbManager.getSheetSyncSettings();

      if (!settings || !settings.spreadsheetId) {
        return { success: false, message: 'Falta el ID de la Hoja de Cálculo.' };
      }

      const authMethod = settings.authMethod || 'oauth';
      let rows: string[][] = [];
      const { spreadsheetId: cleanSpreadsheetId, gid } = extractSheetInfo(settings.spreadsheetId);

      if (!cleanSpreadsheetId) {
        return { success: false, message: 'El ID o enlace de la Hoja de Cálculo proporcionado no es válido.' };
      }

      if (authMethod === 'public') {
        // Opción A: Hoja pública mediante exportación CSV
        let url = `https://docs.google.com/spreadsheets/d/${cleanSpreadsheetId}/export?format=csv`;
        if (gid) {
          url += `&gid=${gid}`;
        }

        const axios = require('axios');
        let axiosRes;
        let retries = 3;
        
        while (retries > 0) {
            try {
                axiosRes = await axios.get(url, { 
                  responseType: 'text', 
                  validateStatus: () => true, 
                  timeout: 15000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  }
                });
                break;
            } catch (err: any) {
                retries--;
                if (retries === 0) {
                    return { success: false, message: `Error de red al conectar con Google Sheets: ${err.message}` };
                }
                await new Promise(res => setTimeout(res, 2000));
            }
        }
        
        if (!axiosRes || axiosRes.status !== 200) {
           return { success: false, message: `No se pudo acceder a la hoja pública (Código HTTP: ${axiosRes ? axiosRes.status : 'Desconocido'}). Verifica que el ID sea correcto y que el enlace esté compartido públicamente como 'Lector'.` };
        }
        
        const text = axiosRes.data;

        // Validar si Google devolvió HTML (pantalla de inicio de sesión o permiso denegado)
        if (typeof text === 'string' && (text.includes('<!DOCTYPE html') || text.includes('<html') || text.includes('ServiceLogin'))) {
           return { 
             success: false, 
             message: 'Google denegó el acceso público a la hoja. Asegúrate de hacer clic en "Compartir" en tu hoja de Google Sheets, cambiar el acceso general a "Cualquier persona con el enlace" y rol "Lector".' 
           };
        }
        
        // CSV Parser robusto para soportar saltos de línea y comas dentro del texto entrecomillado
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
          // Opción B: Cuenta de servicio JSON
          const path = require('path');
          const fs = require('fs');
          const keyPath = path.join(process.cwd(), 'data', 'credentials.json');
          if (!fs.existsSync(keyPath)) {
            return { success: false, message: 'No se encontró el archivo credentials.json de la Cuenta de Servicio en data/.' };
          }
          const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          sheets = google.sheets({ version: 'v4', auth });
        } else {
          // Opción C: OAuth 2.0 (Login de Google)
          if (!settings.refreshToken) {
            return { success: false, message: 'No hay token de sesión OAuth. Inicia sesión con Google en el panel.' };
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

        // Encapsular el nombre de la hoja entre comillas simples para evitar fallos de sintaxis con espacios (ej: 'Hoja 1'!A:D)
        const safeSheetRange = `'${firstSheetName.replace(/'/g, "\\'")}'!A:D`;
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: cleanSpreadsheetId,
          range: safeSheetRange,
        });

        rows = response.data.values || [];
      }

      if (!rows || rows.length === 0) {
        return { success: false, message: 'La hoja de cálculo está vacía.' };
      }

      return { success: true, rows };
    } catch (error: any) {
      console.error('❌ Error al acceder a Google Sheets:', error);
      return { success: false, message: `Error al acceder a Google Sheets: ${error.message}` };
    }
  }

  /**
   * Sincroniza la base de datos local con los datos de Google Sheets
   */
  async syncNow(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const settings = await dbManager.getSheetSyncSettings();

      if (!settings || !settings.spreadsheetId) {
        return { success: false, message: 'Falta configurar el ID o enlace de la Hoja de Cálculo.' };
      }

      // Si el usuario sincroniza manualmente, nos aseguramos de que el módulo quede activo
      if (!settings.isActive) {
        settings.isActive = true;
        await dbManager.saveSheetSyncSettings(settings);
      }

      const result = await this.fetchRows();
      if (!result.success || !result.rows) {
        return { success: false, message: result.message || 'Error desconocido al leer la hoja' };
      }

      const rows = result.rows;

      // Borramos TODAS las auto-respuestas anteriores que provengan de Google Sheets
      await this.cleanSynced();

      // Iteramos e insertamos las nuevas
      let importedCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        if (i === 0 && isHeaderRow(rawRow)) continue;

        const parsed = parseRow(rawRow);
        if (!parsed) continue;

        // Insertamos en el almacén de datos (Lowdb o MongoDB)
        await dbManager.createAutoresponder(
          parsed.keyword,
          parsed.matchType, 
          parsed.reply,
          'menu_only', // Respuesta directa
          true,        // isActive
          null,
          JSON.stringify({ source: 'sheets_synced', image: parsed.fileUrl || null })
        );
        importedCount++;
      }

      // Actualizamos la fecha de última sincronización
      settings.lastSyncTime = new Date();
      await dbManager.saveSheetSyncSettings(settings);

      console.log(`[GoogleSheetsService] Sincronización exitosa: ${importedCount} auto-respuestas guardadas.`);
      return { success: true, message: `Sincronización exitosa. Se importaron ${importedCount} respuestas.`, count: importedCount };

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
      const rawRow = result.rows[i];
      if (i === 0 && isHeaderRow(rawRow)) continue;

      const parsed = parseRow(rawRow);
      if (!parsed) continue;

      preview.push({
        keyword: parsed.keyword,
        reply: parsed.reply,
        matchType: parsed.matchType === 'contains' ? 'Contiene (2)' : 'Exacta (1)',
        fileUrl: parsed.fileUrl || ''
      });
      count++;
      if (count >= 200) break; // Límite de vista previa
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
        if (ar.options && ar.options.includes('sheets_synced')) {
          await dbManager.deleteAutoresponder(ar.id);
        }
      }
      return { success: true, message: 'Se eliminaron todas las respuestas sincronizadas de Google Sheets.' };
    } catch (error: any) {
      return { success: false, message: `Error al limpiar: ${error.message}` };
    }
  }
}

