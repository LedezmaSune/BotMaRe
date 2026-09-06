'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Key, Cpu, Shield, Globe, Terminal, Info, Brain, Download, RefreshCw, Trash2, FileText, ExternalLink } from 'lucide-react';

interface SettingsProps {
    settings: any;
    networkStatus?: any;
    onUpdate: (settings: any) => Promise<void>;
    onParseEnv: (content: string) => Promise<boolean>;
    onResetWhatsApp: () => Promise<void>;
}

interface SettingKey {
    id: string;
    label: string;
    desc: string;
    provider?: string;
    url?: string;
}

export const Settings: React.FC<SettingsProps> = ({ settings, networkStatus, onUpdate, onParseEnv, onResetWhatsApp }) => {
    const [localSettings, setLocalSettings] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        await onUpdate(localSettings);
        setIsSaving(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus('loading');
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            const success = await onParseEnv(content);
            setUploadStatus(success ? 'success' : 'error');
            setTimeout(() => setUploadStatus('idle'), 3000);
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const template = `# Plantilla de Configuración para BotMaRe
# Llena los valores que necesites e importa este archivo en el Dashboard.

GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
NVIDIA_API_KEY=
OPENAI_API_KEY=

AI_ENABLED=true
AUTORESPONDERS_ENABLED=true
ENABLE_GROUPS=false

GEMINI_MODEL=gemini-1.5-flash
OPENAI_MODEL=gpt-4o-mini
NVIDIA_MODEL=deepseek-ai/deepseek-v4-pro

TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=

HTTPSMS_API_KEY=
HTTPSMS_FROM_NUMBER=
HTTPSMS_API_URL=https://api-sms.apptienda.online/v1/messages/send

PORT=8001
DASHBOARD_USER=admin
DASHBOARD_PASS=admin123
`;
        const blob = new Blob([template], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.env.example';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const sections: Array<{ title: string; icon: any; keys: SettingKey[] }> = [
        {
            title: 'Modelos de Inteligencia Artificial',
            icon: Cpu,
            keys: [
                { id: 'GROQ_API_KEY', label: 'Groq API Key', desc: 'gsk_... (Rápido, Llama 3.3)', provider: 'Groq', url: 'https://console.groq.com/keys' },
                { id: 'CEREBRAS_API_KEY', label: 'Cerebras API Key', desc: 'csk_... (Ultrarrápido, Llama 3.1 70B gratis)', provider: 'Cerebras', url: 'https://cloud.cerebras.ai' },
                { id: 'SAMBANOVA_API_KEY', label: 'SambaNova API Key', desc: 'Llave de SambaNova Cloud (Llama 3.3 gratis)', provider: 'SambaNova', url: 'https://cloud.sambanova.ai' },
                { id: 'SILICONFLOW_API_KEY', label: 'SiliconFlow API Key', desc: 'sk-... (DeepSeek V3/R1 gratis)', provider: 'SiliconFlow', url: 'https://cloud.siliconflow.cn/account/ak' },
                { id: 'MISTRAL_API_KEY', label: 'Mistral API Key', desc: 'Llave de Mistral Console', provider: 'Mistral', url: 'https://console.mistral.ai/api-keys/' },
                { id: 'TOGETHER_API_KEY', label: 'Together AI Key', desc: 'Llave de Together AI', provider: 'Together', url: 'https://api.together.xyz/settings/api-keys' },
                { id: 'GEMINI_API_KEY', label: 'Gemini API Key', desc: 'AIza... (Google AI Studio gratis)', provider: 'Google', url: 'https://aistudio.google.com/app/apikey' },
                { id: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key', desc: 'sk-... (DeepSeek Directo)', provider: 'DeepSeek', url: 'https://platform.deepseek.com/api_keys' },
                { id: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', desc: 'sk-or-... (Múltiples modelos gratis)', provider: 'OpenRouter', url: 'https://openrouter.ai/keys' },
                { id: 'NVIDIA_API_KEY', label: 'Nvidia NIM Key', desc: 'nvapi-... (Créditos gratis)', provider: 'Nvidia', url: 'https://build.nvidia.com' },
                { id: 'OPENAI_API_KEY', label: 'OpenAI API Key', desc: 'sk-... (GPT-4o, GPT-4o-mini)', provider: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
            ]
        },
        {
            title: 'Control Maestro de IA (Modo Humano)',
            icon: Brain,
            keys: [
                { id: 'AI_ENABLED', label: 'IA Activada', desc: 'true / false - Apaga la IA para responder manualmente.', provider: 'Sistema' },
                { id: 'AUTORESPONDERS_ENABLED', label: 'Auto-Respuestas', desc: 'true / false - Habilita los menús y respuestas pre-configuradas.', provider: 'Sistema' },
                { id: 'ENABLE_GROUPS', label: 'Soporte para Grupos', desc: 'true / false - Habilita la respuesta en grupos (requiere mención).', provider: 'Sistema' },
            ]
        },
        {
            title: 'Preferencias de Modelos',
            icon: Brain,
            keys: [
                { id: 'GROQ_MODEL', label: 'Modelo Groq', desc: 'Default: llama-3.3-70b-versatile' },
                { id: 'CEREBRAS_MODEL', label: 'Modelo Cerebras', desc: 'Default: llama3.1-70b' },
                { id: 'SAMBANOVA_MODEL', label: 'Modelo SambaNova', desc: 'Default: Meta-Llama-3.3-70B-Instruct' },
                { id: 'SILICONFLOW_MODEL', label: 'Modelo SiliconFlow', desc: 'Default: deepseek-ai/DeepSeek-V3' },
                { id: 'MISTRAL_MODEL', label: 'Modelo Mistral', desc: 'Default: mistral-small-latest' },
                { id: 'GEMINI_MODEL', label: 'Modelo Gemini', desc: 'Default: gemini-2.5-flash' },
                { id: 'OPENAI_MODEL', label: 'Modelo OpenAI', desc: 'Default: gpt-4o-mini' },
                { id: 'OPENROUTER_MODEL', label: 'Modelo OpenRouter', desc: 'Default: meta-llama/llama-3.2-3b-instruct:free' },
                { id: 'NVIDIA_MODEL', label: 'Modelo Nvidia', desc: 'Default: deepseek-ai/deepseek-v4-pro' },
            ]
        },
        {
            title: 'Integraciones & Sistema',
            icon: Globe,
            keys: [
                { id: 'TELEGRAM_BOT_TOKEN', label: 'Telegram Bot Token', desc: 'De @BotFather', url: 'https://t.me/BotFather' },
                { id: 'TELEGRAM_ALLOWED_USER_IDS', label: 'ID Usuarios Telegram', desc: 'Separados por comas' },
                { id: 'HTTPSMS_API_KEY', label: 'httpSMS API Key', desc: 'Clave para la pasarela de SMS' },
                { id: 'HTTPSMS_FROM_NUMBER', label: 'Teléfonos Emisores SMS', desc: 'Separados por comas con código de país (Ej. +52123..., +1234...)' },
                { id: 'HTTPSMS_API_URL', label: 'httpSMS API URL', desc: 'Default: https://api-sms.apptienda.online/v1/messages/send' },
                { id: 'PORT', label: 'Puerto Backend', desc: 'Default: 8001' },
            ]
        },
        {
            title: 'Seguridad del Dashboard',
            icon: Shield,
            keys: [
                { id: 'DASHBOARD_USER', label: 'Usuario Admin', desc: 'Default: admin' },
                { id: 'DASHBOARD_PASS', label: 'Contraseña Admin', desc: 'Default: admin123' },
            ]
        }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-12"
        >
            
            {/* Header / Import Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-br from-app-card/80 to-app-bg border border-app-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Terminal size={150} />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-inner">
                            <Key className="text-cyan-400" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Configuración Maestra</h2>
                            <p className="text-app-text-muted mt-1">Gestiona tus variables de entorno (.env) de forma segura.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 relative z-10 bg-black/20 p-4 rounded-2xl border border-app-border/50 backdrop-blur-md">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-8 py-3.5 rounded-xl font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            <Save size={18} />
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>

                        <button 
                            onClick={handleDownloadTemplate}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm border-2 bg-app-bg border-app-border text-app-text-muted hover:border-slate-500/50 hover:text-white transition-all active:scale-95"
                        >
                            <Download size={18} />
                            Descargar Plantilla .env
                        </button>

                        <label className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm border-2 cursor-pointer transition-all active:scale-95 ${
                            uploadStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 
                            uploadStatus === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                            'bg-app-bg border-app-border text-app-text-muted hover:border-slate-500/50 hover:text-white'
                        }`}>
                            <Upload size={18} />
                            {uploadStatus === 'loading' ? 'Procesando...' : 
                             uploadStatus === 'success' ? '¡Importado!' :
                             uploadStatus === 'error' ? 'Error al leer' : 'Importar archivo .env'}
                            <input type="file" className="hidden" onChange={handleFileUpload} accept=".env,text/plain" />
                        </label>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Info size={80} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">¿Cómo funciona?</h3>
                    <p className="text-sm text-indigo-100/70 leading-relaxed">
                        Los valores aquí guardados tienen prioridad sobre el archivo <code className="text-cyan-300">.env</code>. 
                        Si dejas un campo vacío, el sistema intentará leerlo desde tu archivo de configuración local.
                    </p>
                </div>
            </div>

            {/* Network & Connectivity Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-app-card/40 backdrop-blur-xl border border-app-border rounded-3xl p-8 shadow-xl mt-8"
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <Globe className="text-emerald-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Redes y Conectividad</h2>
                        <p className="text-app-text-muted text-sm">Estado de túneles y accesos remotos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/20 border border-app-border rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${networkStatus?.cloudflareUrl ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                            <h3 className="font-bold text-white">Cloudflare Tunnel (Público)</h3>
                        </div>
                        {networkStatus?.cloudflareUrl ? (
                            <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-app-border/50">
                                <code className="text-cyan-400 text-sm flex-1 truncate">{networkStatus.cloudflareUrl}</code>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(networkStatus.cloudflareUrl);
                                        alert('URL de Cloudflare copiada al portapapeles');
                                    }}
                                    className="text-app-text-muted hover:text-white px-3 py-1 bg-white/5 rounded-lg text-xs"
                                >
                                    Copiar
                                </button>
                            </div>
                        ) : (
                            <p className="text-app-text-muted text-sm mt-2">Inactivo o no generado.</p>
                        )}
                    </div>

                    <div className="bg-black/20 border border-app-border rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${networkStatus?.tailscaleIp ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                            <h3 className="font-bold text-white">Tailscale VPN (Privado)</h3>
                        </div>
                        {networkStatus?.tailscaleIp ? (
                            <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-app-border/50">
                                <code className="text-emerald-400 text-sm flex-1 truncate">http://{networkStatus.tailscaleIp}:{networkStatus.localPort || 8000}</code>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(`http://${networkStatus.tailscaleIp}:${networkStatus.localPort || 8000}`);
                                        alert('URL de Tailscale copiada al portapapeles');
                                    }}
                                    className="text-app-text-muted hover:text-white px-3 py-1 bg-white/5 rounded-lg text-xs"
                                >
                                    Copiar
                                </button>
                            </div>
                        ) : (
                            <p className="text-app-text-muted text-sm mt-2">Inactivo. Instala e inicia la app de Tailscale.</p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Config Groups */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                }}
            >
                {sections.map((section, sIdx) => (
                    <motion.div 
                        key={sIdx} 
                        variants={{
                            hidden: { opacity: 0, scale: 0.95, y: 20 },
                            show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                        }}
                        className="bg-app-card/20 backdrop-blur-md border border-app-border rounded-3xl p-8 hover:border-app-border-hover transition-colors shadow-lg"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <section.icon className="text-app-text-muted" size={20} />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-app-text-muted">{section.title}</h3>
                        </div>

                        <div className="space-y-6">
                            {section.keys.map((k) => (
                                <div key={k.id} className="group">
                                    <div className="flex items-center justify-between mb-2 ml-1">
                                        <label className="block text-xs font-bold text-app-text-muted group-focus-within:text-cyan-400 transition-colors">
                                            {k.label}
                                        </label>
                                        {k.url && (
                                            <a 
                                                href={k.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full transition-all"
                                            >
                                                Obtener Key <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text/20">
                                            <Key size={16} />
                                        </div>
                                        <input 
                                            type={k.id.includes('PASS') || k.id.includes('KEY') || k.id.includes('TOKEN') ? 'password' : 'text'}
                                            value={localSettings[k.id] || ''}
                                            onChange={(e) => setLocalSettings({...localSettings, [k.id]: e.target.value})}
                                            placeholder={k.desc}
                                            className="w-full bg-black/20 border border-app-border rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/30 focus:bg-black/40 transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div className="p-8 bg-app-card/10 border border-app-border border-dashed rounded-3xl text-center">
                <p className="text-app-text-muted text-xs italic">
                    Toda la información sensible se almacena de forma local en tu base de datos SQLite y nunca sale de tu servidor.
                </p>
            </div>
        </motion.div>
    );
};
