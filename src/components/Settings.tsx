'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Key, Cpu, Shield, Globe, Terminal, Info, Brain, Download, RefreshCw, Trash2, FileText } from 'lucide-react';

interface SettingsProps {
    settings: any;
    onUpdate: (settings: any) => Promise<void>;
    onParseEnv: (content: string) => Promise<boolean>;
    onResetWhatsApp: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdate, onParseEnv, onResetWhatsApp }) => {
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

    const handleDownloadBackup = async () => {
        try {
            window.location.href = '/api/system/backup';
        } catch (e) {
            alert('Error al descargar el respaldo');
        }
    };

    const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('⚠️ ¿Estás seguro? Esto reemplazará todos tus datos actuales con los del respaldo. No podrás deshacer esta acción.')) {
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('backup', file);

        try {
            const res = await fetch('/api/system/restore', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Respaldo restaurado con éxito. Por favor, reinicia el programa manualmente para aplicar los cambios.');
                window.location.reload();
            } else {
                alert('❌ Error: ' + data.message);
            }
        } catch (error) {
            alert('❌ Error de conexión al restaurar.');
        } finally {
            e.target.value = '';
        }
    };

    const handleCleanMultimedia = async () => {
        if (!confirm('¿Deseas eliminar todos los archivos multimedia que ya no están en uso? Esta acción liberará espacio en el disco.')) return;
        
        try {
            const res = await fetch('/api/system/clean-uploads', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('✅ Multimedia antigua eliminada con éxito.');
            }
        } catch (e) {
            alert('❌ Error al conectar con el servidor.');
        }
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

    const sections = [
        {
            title: 'Modelos de Inteligencia Artificial',
            icon: Cpu,
            keys: [
                { id: 'GROQ_API_KEY', label: 'Groq API Key', desc: 'Suele empezar con gsk_', provider: 'Groq' },
                { id: 'GEMINI_API_KEY', label: 'Gemini API Key', desc: 'Google AI Studio', provider: 'Google' },
                { id: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', desc: 'Acceso a múltiples modelos', provider: 'OpenRouter' },
                { id: 'NVIDIA_API_KEY', label: 'Nvidia/DeepSeek Key', desc: 'Para modelos de alto rendimiento', provider: 'Nvidia' },
                { id: 'OPENAI_API_KEY', label: 'OpenAI API Key', desc: 'GPT-4o, GPT-4o-mini', provider: 'OpenAI' },
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
                { id: 'GEMINI_MODEL', label: 'Modelo Gemini', desc: 'Default: gemini-1.5-flash' },
                { id: 'OPENAI_MODEL', label: 'Modelo OpenAI', desc: 'Default: gpt-4o-mini' },
                { id: 'NVIDIA_MODEL', label: 'Modelo Nvidia', desc: 'Default: deepseek-ai/deepseek-v4-pro' },
            ]
        },
        {
            title: 'Integraciones & Sistema',
            icon: Globe,
            keys: [
                { id: 'TELEGRAM_BOT_TOKEN', label: 'Telegram Bot Token', desc: 'De @BotFather' },
                { id: 'TELEGRAM_ALLOWED_USER_IDS', label: 'ID Usuarios Telegram', desc: 'Separados por comas' },
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
                <div className="lg:col-span-2 bg-app-card/40 backdrop-blur-xl border border-app-border rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl">
                            <Terminal className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Configuración Maestra</h2>
                            <p className="text-app-text-muted text-sm">Gestiona tus API Keys y parámetros del sistema.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-bold text-sm hover:bg-cyan-50 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            <Save size={18} />
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>

                        <label className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm border border-app-border cursor-pointer transition-all active:scale-95 ${
                            uploadStatus === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 
                            uploadStatus === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                            'bg-app-card/50 text-white hover:bg-app-card'
                        }`}>
                            <Upload size={18} />
                            {uploadStatus === 'loading' ? 'Procesando...' : 
                             uploadStatus === 'success' ? '¡Importado!' :
                             uploadStatus === 'error' ? 'Error al leer' : 'Importar .env'}
                            <input type="file" className="hidden" onChange={handleFileUpload} accept=".env,text/plain" />
                        </label>

                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={handleDownloadBackup}
                                className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 px-6 py-3 rounded-2xl font-bold text-sm border border-indigo-500/30 transition-all active:scale-95"
                            >
                                <Download size={18} />
                                Generar Respaldo (en partes)
                            </button>
                            <span className="text-[10px] text-indigo-400/50 px-2">Sistema y Multimedia por separado</span>
                        </div>

                        <label className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-6 py-3 rounded-2xl font-bold text-sm border border-emerald-500/30 transition-all active:scale-95 cursor-pointer">
                            <RefreshCw size={18} />
                            Importar Respaldo
                            <input type="file" accept=".zip,.enc" className="hidden" onChange={handleRestoreBackup} />
                        </label>

                        <button 
                            onClick={handleCleanMultimedia}
                            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-6 py-3 rounded-2xl font-bold text-sm border border-red-500/30 transition-all active:scale-95"
                        >
                            <Trash2 size={18} />
                            Limpiar Multimedia
                        </button>

                        <button 
                            onClick={() => window.location.href = '/api/system/export-readable'}
                            className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-6 py-3 rounded-2xl font-bold text-sm border border-amber-500/30 transition-all active:scale-95"
                        >
                            <FileText size={18} />
                            Exportar Legible (TXT + Multimedia)
                        </button>

                        <button 
                            onClick={onResetWhatsApp}
                            className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 px-6 py-3 rounded-2xl font-bold text-sm border border-orange-500/30 transition-all active:scale-95"
                        >
                            <RefreshCw size={18} className="animate-spin-slow" />
                            Cerrar Sesión WhatsApp (Re-escanear)
                        </button>

                        <label className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-6 py-3 rounded-2xl font-bold text-sm border border-emerald-500/30 transition-all active:scale-95 cursor-pointer">
                            <Upload size={18} />
                            Subir Multimedia en Lote
                            <input 
                                type="file" 
                                className="hidden" 
                                multiple 
                                onChange={async (e) => {
                                    const files = e.target.files;
                                    if (!files || files.length === 0) return;
                                    
                                    const formData = new FormData();
                                    for (let i = 0; i < files.length; i++) {
                                        formData.append('files', files[i]);
                                    }
                                    
                                    try {
                                        const res = await fetch('/api/system/upload-multiple', {
                                            method: 'POST',
                                            body: formData
                                        });
                                        const data = await res.json();
                                        alert(`✅ ${data.message}`);
                                    } catch (err) {
                                        alert('❌ Error al subir archivos.');
                                    }
                                }}
                            />
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
                                    <label className="block text-xs font-bold text-app-text-muted mb-2 ml-1 group-focus-within:text-cyan-400 transition-colors">
                                        {k.label}
                                    </label>
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
