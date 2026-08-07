'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Puzzle, 
    Plus, 
    Trash2, 
    Edit3, 
    AlertTriangle, 
    Code2, 
    Power, 
    X, 
    Sparkles, 
    RefreshCw, 
    FileCode, 
    Terminal,
    Upload,
    Copy,
    Check
} from 'lucide-react';

export default function PluginsPage() {
    const [plugins, setPlugins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlugin, setEditingPlugin] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPlugins();
    }, []);

    const fetchPlugins = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/plugins');
            if (data.success) {
                setPlugins(data.plugins || []);
            }
        } catch (error: any) {
            console.error('Error fetching plugins', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlugin?.id || !editingPlugin?.code) return;
        
        setSaving(true);
        setErrorMsg(null);
        try {
            const res = await axios.post('/api/plugins', {
                id: editingPlugin.id,
                code: editingPlugin.code
            });
            if (res.data?.success) {
                setIsModalOpen(false);
                setEditingPlugin(null);
                fetchPlugins();
            } else {
                setErrorMsg(res.data?.error || 'Error al guardar el plugin');
            }
        } catch (error: any) {
            setErrorMsg(error.response?.data?.error || 'Error de conexión al guardar el plugin');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string, currentActive: boolean) => {
        try {
            await axios.post('/api/plugins/toggle', {
                id,
                active: !currentActive
            });
            fetchPlugins();
        } catch (error) {
            alert('Error al cambiar el estado del plugin');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el plugin "${id}"?`)) return;
        try {
            await axios.delete(`/api/plugins/${id}`);
            fetchPlugins();
        } catch (error) {
            alert('Error al eliminar el plugin');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            // Remover la extensión .js y caracteres no permitidos para el ID
            const fileName = file.name.replace(/\.js$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
            
            if (!fileName) {
                alert('Nombre de archivo inválido.');
                return;
            }

            try {
                setLoading(true);
                const res = await axios.post('/api/plugins', {
                    id: fileName,
                    code: content
                });
                
                if (res.data?.success) {
                    fetchPlugins();
                } else {
                    alert(res.data?.error || 'Error al subir el plugin');
                }
            } catch (error: any) {
                alert(error.response?.data?.error || 'Error de conexión al subir el plugin');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Resetear el input
        }
    };

    const openNewModal = () => {
        setErrorMsg(null);
        setEditingPlugin({
            id: '',
            code: `module.exports = {
    name: "Mi Nuevo Plugin",
    description: "Extiende la funcionalidad de BotMaRe enviando respuestas inteligentes.",
    active: true,
    onMessage: async (ctx, api) => {
        // ctx contiene: { text, from, isGroup, pushName, quoted }
        if (ctx.text === '!ping') {
            await api.reply('¡Pong! 🏓 Plugin activo.');
        }
    }
}`
        });
        setIsModalOpen(true);
    };

    const openEditModal = (plugin: any) => {
        setErrorMsg(null);
        setEditingPlugin({ ...plugin });
        setIsModalOpen(true);
    };

    const copyPrompt = () => {
        const promptText = `Actúa como un desarrollador experto en Node.js y frameworks de bots de WhatsApp.

Tengo un sistema de bots propio llamado "BotMaRe" que utiliza un entorno Sandbox (VM) para ejecutar plugins. Necesito que adaptes un plugin creado originalmente para Baileys (ej. Mystic Bot) a la arquitectura estricta de BotMaRe.

REGLAS DE ARQUITECTURA DE BOTMARE:
1. El plugin DEBE exportarse exactamente con esta estructura:
module.exports = {
    name: "Nombre del Plugin",
    description: "Descripción breve",
    active: true,
    onMessage: async (ctx, api) => {
        // Lógica aquí
    }
};

2. EL OBJETO \`ctx\` CONTIENE:
- \`ctx.text\`: El mensaje de texto que envió el usuario.
- \`ctx.from\`: El número/JID del remitente o grupo.
- \`ctx.isGroup\`: Booleano (true/false) si es un grupo.
- \`ctx.pushName\`: Nombre de perfil de WhatsApp del remitente.

3. EL OBJETO \`api\` CONTIENE ÚNICAMENTE LAS SIGUIENTES FUNCIONES:
- \`api.reply(text)\`: Responde con un texto al chat actual.
- \`api.sendTo(jid, text)\`: Envía un texto a un chat específico.
- \`api.sendMedia(url, caption, type)\`: Descarga y envía un archivo desde una URL. \`type\` puede ser 'image', 'video', 'audio', o 'document'.
- \`api.getPlugins()\`: Devuelve un arreglo con los metadatos de los plugins instalados.

4. INSTRUCCIONES DE CONVERSIÓN:
- No uses \`import\` ni \`export\` bajo ninguna circunstancia. El sandbox utiliza CommonJS puro.
- No uses \`export default handler\` ni dependas de argumentos como \`m, {conn, command}\`. Extrae el comando usando Expresiones Regulares sobre \`ctx.text\`.
- Si el plugin original descargaba contenido y usaba \`conn.sendMessage(m.chat, { video: ... })\`, cámbialo para que use \`await api.sendMedia(url, caption, 'video')\`.
- Todos los mensajes de texto (reacciones, errores, respuestas) deben enviarse usando \`await api.reply(texto)\`.
- Si el plugin original usa \`global.APIs\` o \`global.APIKeys\`, déjalo intacto (BotMaRe lo inyecta automáticamente).
- Si el plugin original usa librerías como \`axios\` o \`fs\`, NO las importes con \`require\` ni \`import\`. Úsalas directamente porque ya están inyectadas de forma global.

A continuación te paso el código del plugin de Baileys. Devuélveme ÚNICAMENTE el código adaptado para BotMaRe, sin explicaciones, listo para guardar en un archivo .js:

[PEGA EL CÓDIGO DEL PLUGIN AQUÍ]`;
        navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border/30 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl">
                            <Puzzle className="w-7 h-7 text-purple-400" />
                        </div>
                        Gestor de Plugins JS
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                        Añade lógica personalizada en JavaScript para interceptar mensajes y automatizar respuestas dinámicas en BotMaRe.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchPlugins}
                        disabled={loading}
                        className="p-3 bg-app-card/60 hover:bg-app-card text-slate-300 rounded-xl border border-app-border/50 transition-all active:scale-95 flex items-center gap-2 text-sm font-medium"
                        title="Recargar plugins"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setIsPromptModalOpen(true)}
                        className="px-4 py-3 bg-app-card hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl shadow-lg shadow-amber-500/10 border border-amber-500/30 transition-all active:scale-95 flex items-center gap-2 text-sm"
                        title="Adaptar plugin con IA"
                    >
                        <Sparkles className="w-4 h-4" />
                        Adaptador IA
                    </button>
                    <input 
                        type="file" 
                        accept=".js" 
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-3 bg-app-card hover:bg-purple-600/20 text-purple-400 font-bold rounded-xl shadow-lg shadow-purple-500/10 border border-purple-500/30 transition-all active:scale-95 flex items-center gap-2 text-sm"
                    >
                        <Upload className="w-4 h-4" />
                        Subir Archivo
                    </button>
                    <button 
                        onClick={openNewModal} 
                        className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Plugin
                    </button>
                </div>
            </div>

            {/* List Body */}
            {loading && plugins.length === 0 ? (
                <div className="premium-glass p-12 rounded-2xl border border-app-border/30 text-center flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                    <p className="text-slate-400 text-sm font-medium">Cargando plugins del sistema...</p>
                </div>
            ) : plugins.length === 0 ? (
                <div className="premium-glass p-12 rounded-2xl border border-dashed border-app-border/50 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                        <FileCode className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">No tienes plugins instalados</h3>
                        <p className="text-slate-400 text-sm max-w-md">
                            Crea tu primer script de automatización en JavaScript para potenciar BotMaRe.
                        </p>
                    </div>
                    <button 
                        onClick={openNewModal} 
                        className="mt-2 px-5 py-2.5 bg-purple-600/80 hover:bg-purple-600 text-white font-semibold rounded-xl text-sm transition-all"
                    >
                        Crear Plugin
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plugins.map((plugin: any) => (
                        <div 
                            key={plugin.id} 
                            className={`premium-glass rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
                                !plugin.active 
                                    ? 'border-app-border/30 opacity-70 hover:opacity-100' 
                                    : plugin.error 
                                        ? 'border-red-500/40 bg-red-950/10' 
                                        : 'border-purple-500/30 hover:border-purple-500/50 shadow-lg shadow-purple-500/5'
                            }`}
                        >
                            <div className="p-5 space-y-3">
                                {/* Plugin Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        <div className={`p-2 rounded-xl border ${plugin.active ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                            <Code2 className="w-5 h-5" />
                                        </div>
                                        <div className="truncate">
                                            <h3 className="font-bold text-white truncate text-base">{plugin.name || plugin.id}</h3>
                                            <span className="text-[11px] font-mono text-slate-400">id: {plugin.id}.js</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleToggle(plugin.id, plugin.active)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                            plugin.active 
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        <Power className="w-3 h-3" />
                                        {plugin.active ? 'Activo' : 'Inactivo'}
                                    </button>
                                </div>

                                {/* Plugin Description */}
                                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                                    {plugin.description || 'Sin descripción disponible.'}
                                </p>

                                {/* Error alert if present */}
                                {plugin.error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                        <span className="font-mono break-all">{plugin.error}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions footer */}
                            <div className="px-5 py-3 border-t border-app-border/30 bg-app-card/30 flex items-center justify-between">
                                <button 
                                    onClick={() => openEditModal(plugin)}
                                    className="px-3 py-1.5 bg-app-card hover:bg-purple-600/20 border border-app-border hover:border-purple-500/40 text-xs font-medium text-slate-200 hover:text-purple-300 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Editar Código
                                </button>
                                <button 
                                    onClick={() => handleDelete(plugin.id)}
                                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium text-red-400 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Edición / Creación */}
            {isModalOpen && editingPlugin && (
                <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-[#111827] border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-app-border/50 flex items-center justify-between bg-app-card/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                                    <Terminal className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {editingPlugin.id ? `Editar Plugin: ${editingPlugin.id}` : 'Nuevo Plugin Custom'}
                                    </h2>
                                    <p className="text-xs text-slate-400">Define el script sandbox en JavaScript Node.js</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-app-card rounded-xl text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form id="plugin-form" onSubmit={handleSave} className="p-6 flex-1 overflow-y-auto space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                    ID del Archivo (Nombre único sin .js)
                                </label>
                                <input 
                                    disabled={!!plugins.find((p: any) => p.id === editingPlugin.id)}
                                    value={editingPlugin.id} 
                                    onChange={e => setEditingPlugin({...editingPlugin, id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})}
                                    placeholder="mi_nuevo_plugin"
                                    required
                                    className="w-full px-4 py-2.5 bg-[#0b0f19] border border-app-border/70 rounded-xl font-mono text-sm text-purple-300 focus:outline-none focus:border-purple-500 disabled:opacity-60"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Solo letras, números, guiones bajo (_) y guiones (-).</p>
                            </div>

                            <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                        Código JavaScript (module.exports)
                                    </label>
                                    <span className="text-[11px] text-slate-400">Entorno Sandbox Node.js VM</span>
                                </div>
                                <textarea
                                    className="w-full h-80 p-4 font-mono text-xs bg-[#090d16] border border-app-border/70 rounded-xl text-emerald-400 focus:outline-none focus:border-purple-500 leading-relaxed shadow-inner"
                                    value={editingPlugin.code}
                                    onChange={e => setEditingPlugin({...editingPlugin, code: e.target.value})}
                                    required
                                    spellCheck="false"
                                />
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-app-border/50 bg-app-card/50 flex items-center justify-between">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                Los cambios se aplicarán inmediatamente al guardar.
                            </span>
                            <div className="flex items-center gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-app-card hover:bg-app-border/50 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    form="plugin-form"
                                    disabled={saving}
                                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    Guardar y Aplicar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal del Prompt IA */}
            {isPromptModalOpen && (
                <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-[#111827] border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-app-border/50 flex items-center justify-between bg-app-card/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Prompt Maestro IA</h2>
                                    <p className="text-xs text-slate-400">Pega esto en ChatGPT, Claude o Gemini para adaptar tus plugins.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsPromptModalOpen(false)}
                                className="p-2 hover:bg-app-card rounded-xl text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="bg-[#090d16] border border-app-border/70 rounded-xl p-4 overflow-y-auto max-h-[50vh] font-mono text-xs text-emerald-400 leading-relaxed shadow-inner">
                                <pre className="whitespace-pre-wrap">Actúa como un desarrollador experto en Node.js y frameworks de bots de WhatsApp.

Tengo un sistema de bots propio llamado "BotMaRe" que utiliza un entorno Sandbox (VM) para ejecutar plugins. Necesito que adaptes un plugin creado originalmente para Baileys (ej. Mystic Bot) a la arquitectura estricta de BotMaRe.

REGLAS DE ARQUITECTURA DE BOTMARE:
1. El plugin DEBE exportarse exactamente con esta estructura:
module.exports = {'{'}
    name: "Nombre del Plugin",
    description: "Descripción breve",
    active: true,
    onMessage: async (ctx, api) =&gt; {'{'}
        // Lógica aquí
    {'}'}
{'}'};

2. EL OBJETO \`ctx\` CONTIENE:
- \`ctx.text\`: El mensaje de texto que envió el usuario.
- \`ctx.from\`: El número/JID del remitente o grupo.
- \`ctx.isGroup\`: Booleano (true/false) si es un grupo.
- \`ctx.pushName\`: Nombre de perfil de WhatsApp del remitente.

3. EL OBJETO \`api\` CONTIENE ÚNICAMENTE LAS SIGUIENTES FUNCIONES:
- \`api.reply(text)\`: Responde con un texto al chat actual.
- \`api.sendTo(jid, text)\`: Envía un texto a un chat específico.
- \`api.sendMedia(url, caption, type)\`: Descarga y envía un archivo desde una URL. \`type\` puede ser 'image', 'video', 'audio', o 'document'.
- \`api.getPlugins()\`: Devuelve un arreglo con los metadatos de los plugins instalados.

4. INSTRUCCIONES DE CONVERSIÓN:
- No uses \`import\` ni \`export\` bajo ninguna circunstancia. El sandbox utiliza CommonJS puro.
- No uses \`export default handler\` ni dependas de argumentos como \`m, &#123;conn, command&#125;\`. Extrae el comando usando Expresiones Regulares sobre \`ctx.text\`.
- Si el plugin original descargaba contenido y usaba \`conn.sendMessage(m.chat, &#123; video: ... &#125;)\`, cámbialo para que use \`await api.sendMedia(url, caption, 'video')\`.
- Todos los mensajes de texto (reacciones, errores, respuestas) deben enviarse usando \`await api.reply(texto)\`.
- Si el plugin original usa \`global.APIs\` o \`global.APIKeys\`, déjalo intacto (BotMaRe lo inyecta automáticamente).
- Si el plugin original usa librerías como \`axios\` o \`fs\`, NO las importes con \`require\` ni \`import\`. Úsalas directamente porque ya están inyectadas de forma global.

A continuación te paso el código del plugin de Baileys. Devuélveme ÚNICAMENTE el código adaptado para BotMaRe, sin explicaciones, listo para guardar en un archivo .js:

...[Pega tu código de Baileys al final]...</pre>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-app-border/50 bg-app-card/50 flex justify-end">
                            <button 
                                onClick={copyPrompt}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? "¡Copiado!" : "Copiar Prompt Completo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
