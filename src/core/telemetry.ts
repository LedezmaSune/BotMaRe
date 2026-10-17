import fs from 'fs';
import path from 'path';
import { getActiveEngine } from './db';
import { TelemetryModel } from './db/mongo.models';

export interface TelemetryData {
    llm: {
        totalRequests: number;
        totalTokens: number;
        totalLatencyMs: number;
        providerStats: Record<string, { requests: number; tokens: number; latencyMs: number }>;
    };
    baileys: {
        disconnects: number;
        reconnects: number;
        messagesSent: number;
    };
    lastUpdated: number;
}

const TELEMETRY_FILE = path.join(process.cwd(), 'data', 'telemetry.json');

class TelemetryCollector {
    private data: TelemetryData;
    private isDirty = false;
    private saveTimeout: NodeJS.Timeout | null = null;
    private isFlushing = false;

    constructor() {
        this.data = this.load();
        process.on('beforeExit', () => {
            if (this.isDirty) {
                this.flushSync();
            }
        });
    }

    public async syncWithEngine(): Promise<void> {
        try {
            if (getActiveEngine && getActiveEngine() === 'mongodb') {
                const doc = await TelemetryModel.findOne({ id: 'global' }).lean();
                if (doc && doc.llm && doc.baileys) {
                    const stats = doc.llm.providerStats instanceof Map
                        ? Object.fromEntries(doc.llm.providerStats)
                        : (typeof doc.llm.providerStats === 'object' ? doc.llm.providerStats : {});
                    this.data = {
                        llm: {
                            totalRequests: doc.llm.totalRequests || 0,
                            totalTokens: doc.llm.totalTokens || 0,
                            totalLatencyMs: doc.llm.totalLatencyMs || 0,
                            providerStats: stats
                        },
                        baileys: {
                            disconnects: doc.baileys.disconnects || 0,
                            reconnects: doc.baileys.reconnects || 0,
                            messagesSent: doc.baileys.messagesSent || 0
                        },
                        lastUpdated: doc.lastUpdated || Date.now()
                    };
                } else if (this.data.llm.totalRequests > 0 || this.data.baileys.messagesSent > 0) {
                    await TelemetryModel.updateOne(
                        { id: 'global' },
                        { $set: this.data },
                        { upsert: true }
                    );
                }
            }
        } catch (e) {
            console.error('[Telemetry] Error syncing with database engine:', e);
        }
    }

    private load(): TelemetryData {
        try {
            if (fs.existsSync(TELEMETRY_FILE)) {
                const raw = fs.readFileSync(TELEMETRY_FILE, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[Telemetry] Error loading telemetry file, starting fresh.');
        }
        return this.getDefaultData();
    }

    private getDefaultData(): TelemetryData {
        return {
            llm: { totalRequests: 0, totalTokens: 0, totalLatencyMs: 0, providerStats: {} },
            baileys: { disconnects: 0, reconnects: 0, messagesSent: 0 },
            lastUpdated: Date.now()
        };
    }

    private scheduleSave() {
        this.isDirty = true;
        if (this.saveTimeout) return; // Ya hay un volcado programado
        this.saveTimeout = setTimeout(() => {
            this.flush().catch(e => console.warn('[Telemetry] Error in debounced flush:', e));
        }, 1000);
    }

    public async flush(): Promise<void> {
        if (!this.isDirty || this.isFlushing) return;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.isFlushing = true;
        this.isDirty = false;

        try {
            this.data.lastUpdated = Date.now();

            // 1. Guardar en MongoDB si está activo
            try {
                if (getActiveEngine && getActiveEngine() === 'mongodb') {
                    await TelemetryModel.updateOne(
                        { id: 'global' },
                        { $set: this.data },
                        { upsert: true }
                    );
                }
            } catch (e) {
                console.warn('[Telemetry] Error saving telemetry to MongoDB:', e);
            }

            // 2. Guardar asíncronamente en disco
            const dir = path.dirname(TELEMETRY_FILE);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(TELEMETRY_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (e) {
            console.warn('[Telemetry] Error saving telemetry file asynchronously:', e);
            this.isDirty = true;
        } finally {
            this.isFlushing = false;
        }
    }

    public flushSync(): void {
        if (!this.isDirty) return;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        try {
            this.data.lastUpdated = Date.now();
            const dir = path.dirname(TELEMETRY_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
            this.isDirty = false;
        } catch (e) {
            console.warn('[Telemetry] Error in flushSync:', e);
        }
    }

    private save() {
        this.scheduleSave();
    }

    public recordLLMRequest(provider: string, tokens: number, latencyMs: number) {
        this.data.llm.totalRequests++;
        this.data.llm.totalTokens += tokens;
        this.data.llm.totalLatencyMs += latencyMs;

        if (!this.data.llm.providerStats[provider]) {
            this.data.llm.providerStats[provider] = { requests: 0, tokens: 0, latencyMs: 0 };
        }
        
        this.data.llm.providerStats[provider].requests++;
        this.data.llm.providerStats[provider].tokens += tokens;
        this.data.llm.providerStats[provider].latencyMs += latencyMs;
        
        this.save();
    }

    public recordBaileysDisconnect() {
        this.data.baileys.disconnects++;
        this.save();
    }

    public recordBaileysReconnect() {
        this.data.baileys.reconnects++;
        this.save();
    }

    public recordMessageSent() {
        this.data.baileys.messagesSent++;
        this.save();
    }

    public getData(): TelemetryData {
        return this.data;
    }
}

export const telemetry = new TelemetryCollector();
