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
        const candidates: { name: string; address: string }[] = [];

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Solo IPv4 y no internos
                if (net.family === 'IPv4' && !net.internal) {
                    candidates.push({ name, address: net.address });
                }
            }
        }

        if (candidates.length === 0) {
            return 'localhost';
        }

        // Lista de palabras clave para ignorar (interfaces virtuales, túneles, etc.)
        const ignoreKeywords = ['cloudflare', 'warp', 'tailscale', 'virtualbox', 'vmware', 'vbox', 'wsl', 'hyper-v', 'host-only', 'local 2', 'local 3', 'loopback', 'teredo', 'vpn', 'zerotier', 'hamachi'];

        // Filtrar candidatos que no tengan palabras clave de ignorado
        const physicalCandidates = candidates.filter(c => {
            const lowerName = c.name.toLowerCase();
            return !ignoreKeywords.some(kw => lowerName.includes(kw));
        });

        // Si tenemos candidatos físicos, priorizar aquellos que parezcan Wi-Fi o Ethernet principales
        if (physicalCandidates.length > 0) {
            const priorityKeywords = ['wi-fi', 'wifi', 'ethernet', 'lan', 'wlan', 'eth', 'conexión de área local'];
            
            // Buscar el que mejor coincida con los prioritarios
            for (const kw of priorityKeywords) {
                const found = physicalCandidates.find(c => c.name.toLowerCase().includes(kw));
                if (found) {
                    return found.address;
                }
            }
            
            // Si ninguno coincide con prioridad, retornar el primer candidato físico
            return physicalCandidates[0].address;
        }

        // Si no hay candidatos físicos (todos son virtuales/VPN), retornar el primero disponible
        return candidates[0].address;
    }
}
