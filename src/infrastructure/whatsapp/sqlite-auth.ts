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
                const info = db.prepare("DELETE FROM whatsapp_auth WHERE id LIKE 'pre-key-%'").run();
                console.log(`[SQLite Auth] Purged ${info.changes} pre-keys to reduce DB size.`);
                db.prepare("VACUUM").run(); // Optimize DB size after deletion
            } catch (error: any) {
                console.error("[SQLite Auth] Error purging pre-keys:", error.message);
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
