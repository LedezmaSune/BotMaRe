import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

export class SystemUtils {
    static checkDependencies() {
        // Silencio para el arranque estructurado
    }

    static validateEnv() {
        const required: string[] = []; // PORT es opcional
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.error(`[Fase 0] Error: Faltan variables de entorno: ${missing.join(', ')}`);
            process.exit(1);
        }
    }

    static ensureDirs() {
        const dirs = ['data', 'data/uploads', 'data/logs'];
        dirs.forEach(dir => {
            const fullPath = path.resolve(dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    static getLocalIP(): string {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
        return 'localhost';
    }
}
