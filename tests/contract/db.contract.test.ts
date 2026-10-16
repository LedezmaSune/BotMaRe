import { describe, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { LowdbAdapter } from '../../src/core/db/lowdb.adapter';
import { MongoAdapter } from '../../src/core/db/mongo.adapter';
import { runDatabaseAdapterContractTests } from './db.adapter.contract';

describe('Database Adapters Contract Suite', () => {
    const testDbPath = path.resolve('data/test_contract_db.json');

    // 1. Ejecución contra LowdbAdapter
    describe('LowdbAdapter', () => {
        let lowdbAdapter: LowdbAdapter;

        const cleanup = async () => {
            if (fs.existsSync(testDbPath)) {
                try {
                    fs.unlinkSync(testDbPath);
                } catch {
                    // Ignorar si está bloqueado temporalmente
                }
            }
        };

        beforeAll(async () => {
            await cleanup();
            lowdbAdapter = new LowdbAdapter(testDbPath);
            await lowdbAdapter.initDB();
        });

        afterAll(async () => {
            await cleanup();
        });

        runDatabaseAdapterContractTests({
            adapterName: 'LowdbAdapter',
            getAdapter: async () => lowdbAdapter,
            cleanup: async () => {
                // Limpiar colecciones entre tests sin borrar el archivo
                const raw = lowdbAdapter.getRawDb();
                if (raw && raw.data) {
                    raw.data.users = [];
                    raw.data.reminders = [];
                    raw.data.messages = [];
                    raw.data.audits = [];
                    raw.data.templates = [];
                    raw.data.paused_chats = [];
                    raw.data.autoresponders = [];
                    raw.data.user_states = [];
                    raw.data.sheet_sync_settings = null;
                    await raw.write();
                }
            }
        });
    });

    // 2. Ejecución contra MongoAdapter (solo si MONGO_URI_TEST está definida)
    const mongoTestUri = process.env.MONGO_URI_TEST;
    const mongoDescribe = mongoTestUri ? describe : describe.skip;

    mongoDescribe('MongoAdapter (MONGO_URI_TEST)', () => {
        let mongoAdapter: MongoAdapter;

        beforeAll(async () => {
            if (mongoTestUri) {
                mongoAdapter = new MongoAdapter(mongoTestUri);
                await mongoAdapter.initDB();
            }
        });

        runDatabaseAdapterContractTests({
            adapterName: 'MongoAdapter',
            getAdapter: async () => mongoAdapter,
            cleanup: async () => {
                // Si corre contra Mongo real, aquí se limpiarían las colecciones de prueba
            }
        });
    });
});
