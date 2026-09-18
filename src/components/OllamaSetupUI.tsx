"use client";
import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Zap, Check, AlertTriangle, Terminal, Save, Copy } from 'lucide-react';

interface HardwareSpecs {
    cpu: { model: string, cores: number };
    ram: { totalGb: number, freeGb: number, usedGb: number, usagePercent: number };
    os: { platform: string, arch: string, uptime: number };
}

interface OllamaRecommendation {
    canRunOllama: boolean;
    suggestedModels: string[];
    reason: string;
}

export default function OllamaSetupUI() {
    const [hardware, setHardware] = useState<HardwareSpecs | null>(null);
    const [recommendation, setRecommendation] = useState<OllamaRecommendation | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiUrl, setApiUrl] = useState('http://localhost:11434');
    const [model, setModel] = useState('');
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        fetchHardwareSpecs();
        fetchCurrentConfig();
    }, []);

    const fetchHardwareSpecs = async () => {
        try {
            const res = await fetch('/api/system/hardware');
            const data = await res.json();
            if (data.success) {
                setHardware(data.hardware);
                setRecommendation(data.ollamaRecommendation);
            }
        } catch (error) {
            console.error("Error fetching hardware specs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentConfig = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data) {
                if (data.OLLAMA_API_URL) setApiUrl(data.OLLAMA_API_URL);
                if (data.OLLAMA_MODEL) setModel(data.OLLAMA_MODEL);
            }
        } catch (error) {
            console.error("Error fetching config:", error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    OLLAMA_API_URL: apiUrl,
                    OLLAMA_MODEL: model
                })
            });
            if (res.ok) {
                alert('Configuración de Ollama guardada exitosamente. Reinicia el bot para aplicar los cambios.');
            } else {
                alert('Error al guardar la configuración.');
            }
        } catch (error) {
            console.error(error);
        }
        setSaving(false);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Server className="w-8 h-8 text-indigo-500" />
                    IA Local (Ollama)
                </h1>
                <p className="text-slate-400 mt-2">
                    Configura Inteligencia Artificial gratuita y sin internet corriendo directamente en tu computadora o VPS.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel de Hardware */}
                <div className="premium-glass p-6 rounded-2xl border border-app-border/30">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Cpu className="w-5 h-5 text-emerald-400" />
                        Análisis de Hardware
                    </h2>
                    
                    {loading ? (
                        <div className="animate-pulse flex flex-col space-y-4">
                            <div className="h-12 bg-white/5 rounded-lg w-full"></div>
                            <div className="h-12 bg-white/5 rounded-lg w-full"></div>
                        </div>
                    ) : hardware && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                                <Cpu className="w-8 h-8 text-slate-400 mt-1" />
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-300">Procesador (CPU)</h3>
                                    <p className="text-white">{hardware.cpu.model}</p>
                                    <p className="text-xs text-slate-400">{hardware.cpu.cores} Núcleos Lógicos</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                                <HardDrive className="w-8 h-8 text-slate-400 mt-1" />
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-slate-300">Memoria RAM</h3>
                                    <p className="text-white">{hardware.ram.totalGb} GB Instalados</p>
                                    
                                    <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full ${hardware.ram.usagePercent > 85 ? 'bg-red-500' : hardware.ram.usagePercent > 60 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${hardware.ram.usagePercent}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-slate-400">
                                        <span>Usado: {hardware.ram.usedGb} GB</span>
                                        <span>Libre: {hardware.ram.freeGb} GB</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel de Recomendaciones */}
                <div className="premium-glass p-6 rounded-2xl border border-app-border/30">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-amber-400" />
                        Modelos Recomendados
                    </h2>
                    
                    {!loading && recommendation && (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
                                {recommendation.reason}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-slate-300 mb-2">Instala tu modelo ideal:</h3>
                                {recommendation.suggestedModels.map((recModel, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 group">
                                        <Terminal className="w-4 h-4 text-slate-400" />
                                        <code className="text-sm text-emerald-300 flex-1">ollama pull {recModel}</code>
                                        <button 
                                            onClick={() => handleCopy(`ollama pull ${recModel}`, `cmd-${idx}`)}
                                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        >
                                            {copied === `cmd-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                        </button>
                                        <button 
                                            onClick={() => setModel(recModel)}
                                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs text-white rounded transition-colors"
                                        >
                                            Usar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Configuración */}
            <div className="premium-glass p-6 rounded-2xl border border-app-border/30">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Server className="w-5 h-5 text-blue-400" />
                    Enlace de Conexión
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">URL del Servidor Ollama</label>
                        <input 
                            type="text" 
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            className="w-full bg-black/40 border border-app-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="http://localhost:11434"
                        />
                        <p className="text-xs text-slate-500">Debe ser la ruta donde instalaste Ollama. Si es en esta misma máquina, déjalo en localhost.</p>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Modelo Seleccionado</label>
                        <input 
                            type="text" 
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-black/40 border border-app-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="Ej. qwen2.5:1.5b"
                        />
                        <p className="text-xs text-slate-500">El nombre exacto del modelo que descargaste con el comando pull.</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
            
            {/* Guía Rápida */}
            <div className="premium-glass p-6 rounded-2xl border border-app-border/30 bg-indigo-900/10">
                <h3 className="text-lg font-bold text-white mb-3">🛠️ Manual de Gestión Ollama</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-300">
                    
                    {/* Bloque 1: Instalación Windows/Linux */}
                    <div>
                        <strong className="text-white block mb-2 text-indigo-300">1. Instalación Básica</strong>
                        <p className="mb-2"><strong className="text-white">Windows / Mac:</strong> Descarga desde <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">ollama.com/download</a>. Instala y luego abre tu CMD y ejecuta el comando <code className="text-emerald-400">ollama pull gemma:2b</code>.</p>
                        <p><strong className="text-white">Linux / VPS:</strong> Ejecuta en terminal: <code className="block bg-black/40 p-2 rounded border border-white/5 text-emerald-400 mt-1 mb-1">curl -fsSL https://ollama.com/install.sh | sh</code> Y luego haz el pull del modelo deseado.</p>
                    </div>

                    {/* Bloque 2: Mover Modelos a otro Disco */}
                    <div>
                        <strong className="text-white block mb-2 text-indigo-300">2. Mover Modelos a otro Disco (Windows)</strong>
                        <p className="mb-2">Por defecto, Ollama guarda los gigabytes de los modelos en tu disco C:. Para moverlos a otro SSD:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Abre el <strong>Menú Inicio</strong> y busca "Variables de entorno".</li>
                            <li>Da clic en <strong>Variables de entorno...</strong></li>
                            <li>En "Variables del sistema", da clic en <strong>Nueva</strong>.</li>
                            <li>Nombre: <code className="text-emerald-400">OLLAMA_MODELS</code> | Valor: <code className="text-emerald-400">D:\OllamaModels</code> (o la ruta que desees).</li>
                            <li>Reinicia tu computadora y listo.</li>
                        </ol>
                    </div>

                    {/* Bloque 3: Gestión de Memoria */}
                    <div className="md:col-span-2 bg-black/20 p-4 rounded-xl border border-white/5">
                        <strong className="text-white block mb-2 text-indigo-300">3. Gestión de Memoria (Auto-Apagado vs Manual)</strong>
                        <p className="mb-2">
                            Ollama tiene una función de <strong>Auto-Apagado Inteligente</strong>: si el bot no recibe mensajes por 5 minutos, Ollama descarga automáticamente el modelo de tu memoria RAM para no poner lenta tu PC.
                        </p>
                        <p>
                            Sin embargo, si necesitas liberar tu RAM de forma <strong>inmediata</strong> (ej. para abrir un juego pesado), puedes forzar el apagado abriendo tu consola y ejecutando:
                        </p>
                        <code className="block bg-black/40 p-2 rounded border border-white/5 text-emerald-400 w-fit mt-2">ollama stop qwen2.5:1.5b</code>
                        <p className="text-xs text-slate-500 mt-2">*(Reemplaza el nombre por el modelo que estés usando).*</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
