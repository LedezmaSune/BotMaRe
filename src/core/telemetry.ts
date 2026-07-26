import fs from 'fs';
import path from 'path';

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

    constructor() {
        this.data = this.load();
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

    private save() {
        try {
            this.data.lastUpdated = Date.now();
            fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (e) {
            console.warn('[Telemetry] Error saving telemetry file.', e);
        }
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
