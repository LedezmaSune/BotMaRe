import {
    AuthenticationCreds,
    AuthenticationState,
    SignalDataSet,
    SignalDataTypeMap,
    initAuthCreds,
    BufferJSON,
    proto
} from '@whiskeysockets/baileys';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Custom SQLite provider for Baileys Authentication State.
 * This drastically improves performance on Windows by avoiding thousands of JSON files.
 */
export async function useSQLiteAuthState(dbPath: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void>, purgePreKeys: () => void, close: () => void, clear: () => void }> {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Initialize tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS whatsapp_auth (
            id TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    const readData = (id: string) => {
        const row = db.prepare('SELECT value FROM whatsapp_auth WHERE id = ?').get(id) as { value: string } | undefined;
        if (!row) return null;
        return JSON.parse(row.value, BufferJSON.reviver);
    };

    const writeData = (id: string, value: any) => {
        const data = JSON.stringify(value, BufferJSON.replacer);
        db.prepare('INSERT OR REPLACE INTO whatsapp_auth (id, value) VALUES (?, ?)').run(id, data);
    };

    const removeData = (id: string) => {
        db.prepare('DELETE FROM whatsapp_auth WHERE id = ?').run(id);
    };

    // Load or init creds
    const creds: AuthenticationCreds = readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
                    for (const id of ids) {
                        let value = readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: (data) => {
                    const transaction = db.transaction(() => {
                        for (const category in data) {
                            for (const id in data[category as keyof SignalDataSet]) {
                                const value = data[category as keyof SignalDataSet]![id];
                                const key = `${category}-${id}`;
                                if (value) {
                                    writeData(key, value);
                                } else {
                                    removeData(key);
                                }
                            }
                        }
                    });
                    transaction();
                }
            }
        },
        saveCreds: async () => {
            writeData('creds', creds);
        },
        purgePreKeys: () => {
            try {
                // Contar cuántas pre-keys hay almacenadas
                const countRow = db.prepare("SELECT COUNT(*) as count FROM whatsapp_auth WHERE id LIKE 'pre-key-%'").get() as { count: number };
                const count = countRow?.count || 0;
                
                // Solo purgar si hay más de 300 pre-keys acumuladas, conservando siempre las 100 más recientes
                if (count > 300) {
                    const toDelete = count - 100;
                    const info = db.prepare(`
                        DELETE FROM whatsapp_auth 
                        WHERE id IN (
                            SELECT id FROM whatsapp_auth 
                            WHERE id LIKE 'pre-key-%' 
                            ORDER BY rowid ASC 
                            LIMIT ?
                        )
                    `).run(toDelete);
                    console.log(`[SQLite Auth] Purgadas ${info.changes} pre-keys antiguas (conservadas las 100 más recientes).`);
                    db.prepare("VACUUM").run();
                } else {
                    console.log(`[SQLite Auth] Pre-keys en rango óptimo (${count} keys). Sesión protegida.`);
                }
            } catch (error: any) {
                console.error("[SQLite Auth] Error al optimizar pre-keys:", error.message);
            }
        },
        close: () => {
            try {
                db.close();
            } catch (e) {}
        },
        clear: () => {
            try {
                db.prepare("DELETE FROM whatsapp_auth").run();
                db.prepare("VACUUM").run();
                console.log("[SQLite Auth] Base de datos de autenticación limpiada por completo.");
            } catch (e: any) {
                console.error("[SQLite Auth] Error al vaciar tabla de autenticación:", e.message);
            }
        }
    };
}
