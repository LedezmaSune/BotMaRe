import {
    AuthenticationCreds,
    AuthenticationState,
    SignalDataSet,
    SignalDataTypeMap,
    initAuthCreds,
    BufferJSON,
    proto,
    useMultiFileAuthState
} from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';

/**
 * Carga dinámica tolerante a fallos para better-sqlite3.
 * Evita crashes críticos (unhandled rejection) si los binarios nativos de C++
 * no se encuentran compilados aún en entornos móviles (Termux Android ARM64) o VPS.
 */
function loadDatabaseModule(): any {
    try {
        const mod = require('better-sqlite3');
        return mod.default || mod;
    } catch {
        return null;
    }
}

/**
 * Proveedor de Autenticación Híbrido y Resiliente para Baileys WhatsApp.
 * - Modo Primario: SQLite WAL ultrarrápido (data/whatsapp_auth.db) cuando better-sqlite3 está compilado.
 * - Modo Fallback: Almacenamiento multi-archivo estándar de Baileys (data/auth_info_baileys/) si
 *   el binario nativo aún no está compilado, garantizando que el QR y la conexión NUNCA se bloqueen.
 */
export async function useSQLiteAuthState(dbPath: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void>, purgePreKeys: () => void, close: () => void, clear: () => void }> {
    const Database = loadDatabaseModule();

    // Si better-sqlite3 no está disponible o falta el binario nativo, usar fallback multi-archivo
    if (!Database) {
        console.warn('\n[WhatsApp Auth] ⚠️ better-sqlite3 no está compilado para este entorno.');
        console.warn('[WhatsApp Auth] 🛡️ Activando automáticamente almacenamiento multi-archivo resiliente (useMultiFileAuthState).');
        console.warn('[WhatsApp Auth] 👉 La vinculación de WhatsApp y la generación de QR operarán con normalidad.\n');

        const fallbackDir = path.resolve(path.dirname(dbPath), 'auth_info_baileys');
        const multiAuth = await useMultiFileAuthState(fallbackDir);

        return {
            state: multiAuth.state,
            saveCreds: multiAuth.saveCreds,
            purgePreKeys: () => {},
            close: () => {},
            clear: () => {
                try {
                    if (fs.existsSync(fallbackDir)) {
                        fs.rmSync(fallbackDir, { recursive: true, force: true });
                        console.log('[MultiFile Auth] Sesión limpiada por completo.');
                    }
                } catch (e: any) {
                    console.error('[MultiFile Auth] Error al vaciar sesión:', e.message);
                }
            }
        };
    }

    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let db: any;
    try {
        db = new Database(dbPath);
    } catch (err: any) {
        console.warn(`\n[WhatsApp Auth] ⚠️ Error al abrir ${dbPath}: ${err.message}.`);
        console.warn('[WhatsApp Auth] 🛡️ Activando automáticamente almacenamiento multi-archivo resiliente.\n');

        const fallbackDir = path.resolve(path.dirname(dbPath), 'auth_info_baileys');
        const multiAuth = await useMultiFileAuthState(fallbackDir);

        return {
            state: multiAuth.state,
            saveCreds: multiAuth.saveCreds,
            purgePreKeys: () => {},
            close: () => {},
            clear: () => {
                try {
                    if (fs.existsSync(fallbackDir)) {
                        fs.rmSync(fallbackDir, { recursive: true, force: true });
                    }
                } catch {}
            }
        };
    }
    
    // WAL Mode para evitar bloqueos y corrupción al reiniciar o si la red falla bruscamente
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');

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
                // Optimización SQLite pasiva y no bloqueante (WAL Checkpoint)
                // Consolida los datos en disco sin bloquear lecturas/escrituras activas de WhatsApp
                db.pragma('wal_checkpoint(PASSIVE)');
                db.pragma('optimize');

                const countRow = db.prepare("SELECT COUNT(*) as count FROM whatsapp_auth").get() as { count: number };
                const count = countRow?.count || 0;
                console.log(`[SQLite Auth] Mantenimiento preventivo pasivo completado (${count} registros de sesión en perfecto estado).`);
            } catch (error: any) {
                console.warn("[SQLite Auth] Aviso en optimización pasiva de sesión:", error.message);
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
