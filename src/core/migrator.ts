import fs from 'fs';
const checkFileExists = fs.existsSync;
const writeFileSecure = fs.writeFileSync;
import path from 'path';
import { 
    isMongo, 
    ldb, 
    SettingsModel, 
    MessageModel, 
    AuditModel, 
    ReminderModel, 
    TemplateModel, 
    PausedChatModel, 
    AutoresponderModel, 
    UserStateModel 
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
    console.log('👉 Iniciando migración automática a base de datos híbrida...');
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
            if (isMongo) {
                const ops = sqlSettings.map(s => ({
                    updateOne: {
                        filter: { key: s.key },
                        update: { $set: { value: s.value } },
                        upsert: true
                    }
                }));
                await SettingsModel.bulkWrite(ops);
            } else {
                sqlSettings.forEach(s => {
                    const exists = ldb.get('settings').find({ key: s.key }).value();
                    if (!exists) ldb.get('settings').push({ key: s.key, value: s.value }).write();
                });
            }
            console.log(`  ✓ ${sqlSettings.length} configuraciones migradas.`);
        }

        // 2. Migrar HISTORIAL DE MENSAJES (Messages)
        console.log('✉️ Migrando historial de mensajes...');
        const sqlMessages = sqliteDb.prepare('SELECT * FROM messages').all() as any[];
        if (sqlMessages.length > 0) {
            const parsedMessages = sqlMessages.map(m => ({
                userId: m.userId,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
            }));
            if (isMongo) {
                await MessageModel.insertMany(parsedMessages);
            } else {
                ldb.get('messages').push(...parsedMessages).write();
            }
            console.log(`  ✓ ${sqlMessages.length} mensajes de chat migrados.`);
        }

        // 3. Migrar AUDITORÍAS (Audits)
        console.log('🛡️ Migrando logs de auditoría...');
        const sqlAudits = sqliteDb.prepare('SELECT * FROM audits').all() as any[];
        if (sqlAudits.length > 0) {
            const parsedAudits = sqlAudits.map(a => ({
                userId: a.userId,
                action: a.action,
                details: a.details,
                timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
            }));
            if (isMongo) {
                await AuditModel.insertMany(parsedAudits);
            } else {
                ldb.get('audits').push(...parsedAudits).write();
            }
            console.log(`  ✓ ${sqlAudits.length} logs de auditoría migrados.`);
        }

        // 4. Migrar RECORDATORIOS (Reminders)
        console.log('📅 Migrando recordatorios...');
        const sqlReminders = sqliteDb.prepare('SELECT * FROM reminders').all() as any[];
        if (sqlReminders.length > 0) {
            const parsedReminders = sqlReminders.map(r => ({
                id: r.id,
                userId: r.userId,
                chatId: r.chatId,
                title: r.title || undefined,
                text: r.text,
                time: r.time,
                mediaPath: r.mediaPath || undefined,
                mediaType: r.mediaType || undefined,
                status: r.status,
                repeat: r.repeat || 'none',
                repeatInterval: r.repeatInterval || undefined,
                repeatUnit: r.repeatUnit || undefined,
                timestamp: r.timestamp ? new Date(r.timestamp) : new Date()
            }));
            if (isMongo) {
                await ReminderModel.insertMany(parsedReminders);
            } else {
                ldb.get('reminders').push(...parsedReminders).write();
            }
            console.log(`  ✓ ${sqlReminders.length} recordatorios migrados.`);
        }

        // 5. Migrar PLANTILLAS (Templates)
        console.log('📋 Migrando plantillas...');
        const sqlTemplates = sqliteDb.prepare('SELECT * FROM templates').all() as any[];
        if (sqlTemplates.length > 0) {
            const parsedTemplates = sqlTemplates.map(t => ({
                id: t.id,
                name: t.name,
                content: t.content,
                timestamp: t.timestamp ? new Date(t.timestamp) : new Date()
            }));
            if (isMongo) {
                await TemplateModel.insertMany(parsedTemplates);
            } else {
                ldb.get('templates').push(...parsedTemplates).write();
            }
            console.log(`  ✓ ${sqlTemplates.length} plantillas migradas.`);
        }

        // 6. Migrar CHATS PAUSADOS (Paused Chats)
        console.log('⏸️ Migrando chats pausados...');
        const sqlPaused = sqliteDb.prepare('SELECT * FROM paused_chats').all() as any[];
        if (sqlPaused.length > 0) {
            const parsedPaused = sqlPaused.map(p => ({
                chatId: p.chatId,
                reason: p.reason,
                pausedUntil: p.pausedUntil,
                timestamp: p.timestamp ? new Date(p.timestamp) : new Date()
            }));
            if (isMongo) {
                await PausedChatModel.insertMany(parsedPaused);
            } else {
                ldb.get('paused_chats').push(...parsedPaused).write();
            }
            console.log(`  ✓ ${sqlPaused.length} chats pausados migrados.`);
        }

        // 7. Migrar AUTORESPONDEDORES (Autoresponders)
        console.log('🔄 Migrando autorespondedores...');
        const sqlAuto = sqliteDb.prepare('SELECT * FROM autoresponders').all() as any[];
        if (sqlAuto.length > 0) {
            const parsedAuto = sqlAuto.map(a => ({
                id: a.id,
                keyword: a.keyword,
                matchType: a.matchType,
                response: a.response,
                aiAction: a.aiAction,
                isActive: a.isActive,
                parentId: a.parentId || undefined,
                options: a.options || undefined,
                timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
            }));
            if (isMongo) {
                await AutoresponderModel.insertMany(parsedAuto);
            } else {
                ldb.get('autoresponders').push(...parsedAuto).write();
            }
            console.log(`  ✓ ${sqlAuto.length} autorespondedores migrados.`);
        }

        // 8. Migrar ESTADOS DE MENÚS (User States)
        console.log('👥 Migrando estados de menús...');
        const sqlStates = sqliteDb.prepare('SELECT * FROM user_states').all() as any[];
        if (sqlStates.length > 0) {
            const parsedStates = sqlStates.map(u => ({
                chatId: u.chatId,
                currentMenuId: u.currentMenuId || undefined,
                timestamp: u.timestamp ? new Date(u.timestamp) : new Date()
            }));
            if (isMongo) {
                await UserStateModel.insertMany(parsedStates);
            } else {
                ldb.get('user_states').push(...parsedStates).write();
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
