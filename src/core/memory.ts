import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve('data/database.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        role TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        action TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        chatId TEXT,
        title TEXT,
        text TEXT,
        time TEXT,
        mediaPath TEXT,
        mediaType TEXT,
        status TEXT DEFAULT 'pending',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        repeat TEXT DEFAULT 'none',
        repeatInterval INTEGER,
        repeatUnit TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Database Migrations (in case table already exists without columns)
try { db.exec('ALTER TABLE reminders ADD COLUMN mediaPath TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE reminders ADD COLUMN mediaType TEXT'); } catch (e) {}
try { db.exec("ALTER TABLE reminders ADD COLUMN repeat TEXT DEFAULT 'none'"); } catch (e) {}
try { db.exec('ALTER TABLE reminders ADD COLUMN repeatInterval INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE reminders ADD COLUMN repeatUnit TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE reminders ADD COLUMN title TEXT'); } catch (e) {}
try { db.exec('CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)'); } catch (e) {}

// Default Settings
const defaultSettings = {
    bot_name: "GravityBot",
    system_prompt: "Eres un asistente inteligente y servicial. Responde de forma amable y profesional.",
    possible_responses: "1. Si preguntan precio: Dile que consulte la web.\n2. Si saludan: Saluda cordialmente.",
    AI_ENABLED: "true"
};

Object.entries(defaultSettings).forEach(([key, value]) => {
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
});

export async function getSettings() {
    const rows = db.prepare('SELECT * FROM settings').all() as any[];
    return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
}

export async function updateSettings(settings: Record<string, string>) {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    Object.entries(settings).forEach(([key, value]) => {
        stmt.run(key, value);
    });
}

export interface MessageRow {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
}

export async function addMessage(userId: string, role: string, content: string) {
    const stmt = db.prepare('INSERT INTO messages (userId, role, content) VALUES (?, ?, ?)');
    stmt.run(userId, role, content);
}

export async function getHistory(userId: string, limit: number = 50): Promise<MessageRow[]> {
    const stmt = db.prepare('SELECT role, content FROM messages WHERE userId = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(userId, limit) as any[];
    return rows.reverse().map(row => ({
        role: row.role as any,
        content: row.content
    }));
}

export async function clearHistory(userId: string) {
    const stmt = db.prepare('DELETE FROM messages WHERE userId = ?');
    stmt.run(userId);
}

export async function logAudit(userId: string, action: string, details: any) {
    const stmt = db.prepare('INSERT INTO audits (userId, action, details) VALUES (?, ?, ?)');
    stmt.run(userId, action, JSON.stringify(details));
    console.log(`[Audit Logged] ${action} for user ${userId}`);
}

export async function createReminder(userId: string, chatId: string, text: string, time: string, mediaPath?: string, mediaType?: string, repeat: string = 'none', repeatInterval?: number, repeatUnit?: string, title?: string) {
    const stmt = db.prepare('INSERT INTO reminders (userId, chatId, text, time, mediaPath, mediaType, repeat, repeatInterval, repeatUnit, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(userId, chatId, text, time, mediaPath || null, mediaType || null, repeat, repeatInterval || null, repeatUnit || null, title || null).lastInsertRowid;
}

export async function listReminders(userId: string, includeProcessed: boolean = false) {
    const stmt = includeProcessed
        ? db.prepare('SELECT * FROM reminders WHERE userId = ? ORDER BY time DESC, id DESC')
        : db.prepare("SELECT * FROM reminders WHERE userId = ? AND status = 'pending' ORDER BY time ASC, id ASC");
    return stmt.all(userId);
}

export async function deleteReminder(id: number) {
    const stmt = db.prepare('DELETE FROM reminders WHERE id = ?');
    stmt.run(id);
}

export async function updateReminderStatus(id: number, status: 'pending' | 'processing' | 'sent' | 'failed') {
    const stmt = db.prepare("UPDATE reminders SET status = ? WHERE id = ?");
    return stmt.run(status, id);
}

export async function deleteRemindersBulk(userId: string, type: 'all' | 'pending' | 'sent') {
    if (type === 'pending') {
        db.prepare("DELETE FROM reminders WHERE userId = ? AND status != 'sent'").run(userId);
    } else if (type === 'sent') {
        db.prepare("DELETE FROM reminders WHERE userId = ? AND status = 'sent'").run(userId);
    } else {
        db.prepare("DELETE FROM reminders WHERE userId = ?").run(userId);
    }
}

// Templates API
export async function listTemplates() {
    return db.prepare('SELECT * FROM templates ORDER BY name ASC').all();
}

export async function createTemplate(name: string, content: string) {
    const stmt = db.prepare('INSERT INTO templates (name, content) VALUES (?, ?)');
    return stmt.run(name, content).lastInsertRowid;
}

export async function deleteTemplate(id: number) {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}

export async function updateTemplate(id: number, name: string, content: string) {
    db.prepare('UPDATE templates SET name = ?, content = ? WHERE id = ?').run(name, content, id);
}
