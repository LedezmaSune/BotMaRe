import fs from 'fs';
const checkFileExists = fs.existsSync;
const writeFileSecure = fs.writeFileSync;
import path from 'path';
import { 
    updateSettings,
    addMessage,
    logAudit,
    createRemindersBulk,
    createTemplate,
    pauseChat,
    createAutoresponder,
    setUserState
} from './dbManager';

export async function runMigration(): Promise<void> {
    const sqlitePath = path.resolve('data/database.db');
    const migratedIndicator = path.resolve('data/database.db.migrated');
    
    if (!checkFileExists(sqlitePath) || checkFileExists(migratedIndicator)) {
        // No SQLite database found or already migrated
        return;
    }

    console.log('\n=======================================================');
    console.log('📦 [MIGRADOR] Base de datos SQLite detectada en data/database.db');
    console.log('👉 Iniciando migración automática a base de datos activa...');
    console.log('=======================================================\n');

    let sqliteDb: any = null;
    try {
        const sqliteModule = await import('better-sqlite3');
        const Database = sqliteModule.default || sqliteModule;
        sqliteDb = new Database(sqlitePath, { readonly: true });
    } catch (err: any) {
        console.error('❌ [MIGRADOR] No se pudo abrir SQLite para la migración. ¿better-sqlite3 está instalado?', err.message);
        return;
    }

    try {
        // 1. Migrar CONFIGURACIONES (Settings)
        console.log('⚙️ Migrando configuraciones...');
        const sqlSettings = sqliteDb.prepare('SELECT * FROM settings').all() as any[];
        if (sqlSettings.length > 0) {
            const settingsMap: Record<string, string> = {};
            sqlSettings.forEach(s => {
                settingsMap[s.key] = s.value;
            });
            await updateSettings(settingsMap);
            console.log(`  ✓ ${sqlSettings.length} configuraciones migradas.`);
        }

        // 2. Migrar HISTORIAL DE MENSAJES (Messages)
        console.log('✉️ Migrando historial de mensajes...');
        const sqlMessages = sqliteDb.prepare('SELECT * FROM messages').all() as any[];
        if (sqlMessages.length > 0) {
            for (const m of sqlMessages) {
                await addMessage(m.userId, m.role, m.content);
            }
            console.log(`  ✓ ${sqlMessages.length} mensajes de chat migrados.`);
        }

        // 3. Migrar AUDITORÍAS (Audits)
        console.log('🛡️ Migrando logs de auditoría...');
        const sqlAudits = sqliteDb.prepare('SELECT * FROM audits').all() as any[];
        if (sqlAudits.length > 0) {
            for (const a of sqlAudits) {
                await logAudit(a.userId, a.action, a.details);
            }
            console.log(`  ✓ ${sqlAudits.length} logs de auditoría migrados.`);
        }

        // 4. Migrar RECORDATORIOS (Reminders)
        console.log('📅 Migrando recordatorios...');
        const sqlReminders = sqliteDb.prepare('SELECT * FROM reminders').all() as any[];
        if (sqlReminders.length > 0) {
            const items = sqlReminders.map(r => ({
                chatId: r.chatId,
                title: r.title || undefined,
                text: r.text,
                time: r.time,
                mediaPath: r.mediaPath || undefined,
                mediaType: r.mediaType || undefined,
                status: r.status,
                repeat: r.repeat || 'none',
                repeatInterval: r.repeatInterval || undefined,
                repeatUnit: r.repeatUnit || undefined
            }));
            const userId = sqlReminders[0]?.userId || 'owner';
            await createRemindersBulk(userId, items);
            console.log(`  ✓ ${sqlReminders.length} recordatorios migrados.`);
        }

        // 5. Migrar PLANTILLAS (Templates)
        console.log('📋 Migrando plantillas...');
        const sqlTemplates = sqliteDb.prepare('SELECT * FROM templates').all() as any[];
        if (sqlTemplates.length > 0) {
            for (const t of sqlTemplates) {
                await createTemplate(t.name, t.content);
            }
            console.log(`  ✓ ${sqlTemplates.length} plantillas migradas.`);
        }

        // 6. Migrar CHATS PAUSADOS (Paused Chats)
        console.log('⏸️ Migrando chats pausados...');
        const sqlPaused = sqliteDb.prepare('SELECT * FROM paused_chats').all() as any[];
        if (sqlPaused.length > 0) {
            for (const p of sqlPaused) {
                await pauseChat(p.chatId, p.reason || 'Migrado de SQLite');
            }
            console.log(`  ✓ ${sqlPaused.length} chats pausados migrados.`);
        }

        // 7. Migrar AUTORESPONDEDORES (Autoresponders)
        console.log('🔄 Migrando autorespondedores...');
        const sqlAuto = sqliteDb.prepare('SELECT * FROM autoresponders').all() as any[];
        if (sqlAuto.length > 0) {
            for (const a of sqlAuto) {
                await createAutoresponder(
                    a.keyword, a.matchType, a.response, a.aiAction,
                    Boolean(a.isActive), a.parentId || null, a.options || null
                );
            }
            console.log(`  ✓ ${sqlAuto.length} autorespondedores migrados.`);
        }

        // 8. Migrar ESTADOS DE MENÚS (User States)
        console.log('👥 Migrando estados de menús...');
        const sqlStates = sqliteDb.prepare('SELECT * FROM user_states').all() as any[];
        if (sqlStates.length > 0) {
            for (const u of sqlStates) {
                await setUserState(u.chatId, u.currentMenuId || null);
            }
            console.log(`  ✓ ${sqlStates.length} estados de menús migrados.`);
        }

        // Cerrar conexión SQLite
        sqliteDb.close();

        // Escribir indicador de migración completada
        writeFileSecure(migratedIndicator, `migrated_on=${new Date().toISOString()}`); // NOSONAR

        console.log('\n=======================================================');
        console.log('🎉 [MIGRADOR] ¡MIGRACIÓN COMPLETADA CON ÉXITO!');
        console.log(`💾 Migración registrada en: data/database.db.migrated`);
        console.log('=======================================================\n');

    } catch (migrationError: any) {
        console.error('\n❌ [MIGRADOR] Error crítico durante la migración:', migrationError.message);
        if (sqliteDb) {
            try { sqliteDb.close(); } catch(e) {}
        }
        console.warn('⚠️ Se abortó la migración. La base de datos SQLite original NO fue modificada.');
    }
}
