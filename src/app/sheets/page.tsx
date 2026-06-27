'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, LogOut, Globe, ShieldCheck, KeyRound, UploadCloud, CheckCircle2 } from 'lucide-react';

export default function SheetsPage() {
    const [settings, setSettings] = useState<any>({ authMethod: 'public' });
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'public' | 'service_account' | 'oauth'>('public');
    const [previewData, setPreviewData] = useState<{keyword: string, reply: string, matchType?: string}[] | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    // Estado para la subida de JSON
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        const res = await fetch('/api/sheets/settings');
        if (res.ok) {
            const data = await res.json();
            setSettings(data);
            if (data.authMethod) {
                setActiveTab(data.authMethod);
            }
        }
        setIsLoading(false);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...settings, authMethod: activeTab };
            await fetch('/api/sheets/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert('Ajustes guardados correctamente.');
            setSettings(payload);
        } catch (error) {
            alert('Error al guardar ajustes.');
        }
        setIsSaving(false);
    };

    const handleUploadCredentials = async () => {
        if (!jsonFile) return;
        setUploadStatus('uploading');
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                const credentials = JSON.parse(text);
                
                const res = await fetch('/api/sheets/upload-credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                
                if (res.ok) {
                    setUploadStatus('success');
                    setSettings({ ...settings, authMethod: 'service_account' });
                    setActiveTab('service_account');
                } else {
                    setUploadStatus('error');
                    alert('Error en el formato del JSON.');
                }
            };
            reader.readAsText(jsonFile);
        } catch (err) {
            setUploadStatus('error');
            alert('Error al leer el archivo JSON.');
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/sheets/sync', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert(`¡Sincronización exitosa! Se importaron ${data.count} auto-respuestas.`);
            } else {
                alert(`Error al sincronizar: ${data.message || data.error || 'Error desconocido del servidor'}`);
            }
        } catch (error) {
            alert('Error de conexión al sincronizar.');
        }
        setIsSyncing(false);
    };

    const handlePreview = async () => {
        setIsPreviewing(true);
        try {
            const res = await fetch('/api/sheets/preview');
            const data = await res.json();
            if (data.success) {
                setPreviewData(data.preview);
            } else {
                alert(`Error: ${data.message || 'No se pudo cargar la vista previa.'}`);
            }
        } catch (error) {
            alert('Error de conexión.');
        }
        setIsPreviewing(false);
    };

    const handleClean = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar todas las auto-respuestas vinculadas a Google Sheets? Esto NO borrará las respuestas que hayas creado manualmente.')) return;
        setIsCleaning(true);
        try {
            const res = await fetch('/api/sheets/clean', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
            } else {
                alert(`Error al limpiar: ${data.error || 'Desconocido'}`);
            }
        } catch (error) {
            alert('Error de conexión al limpiar.');
        }
        setIsCleaning(false);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-[60vh] text-cyan-400 font-bold animate-pulse">Cargando configuración...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="premium-glass p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <Database size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">Google Sheets</h2>
                            <p className="text-app-text-muted text-sm max-w-xl">
                                Conecta tus hojas de cálculo para administrar tus menús y auto-respuestas de forma colaborativa y sin tocar código.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-app-bg/50 rounded-xl hover:bg-app-bg transition-colors border border-emerald-500/30">
                            <input 
                                type="checkbox" 
                                checked={!!settings.isActive}
                                onChange={(e) => {
                                    const newSettings = { ...settings, isActive: e.target.checked };
                                    setSettings(newSettings);
                                    // Guardamos automáticamente al cambiar el master switch
                                    fetch('/api/sheets/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newSettings, authMethod: activeTab }) });
                                }}
                                className="w-5 h-5 rounded border-app-border text-emerald-500 focus:ring-emerald-500 focus:ring-offset-app-bg bg-app-card"
                            />
                            <span className="text-sm font-bold text-white mr-2">Encender Módulo</span>
                        </label>
                        
                        <button 
                            onClick={handleSync}
                            disabled={!settings.spreadsheetId || isSyncing || !settings.isActive}
                            className="px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all font-black flex items-center gap-2 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:grayscale"
                        >
                            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel Izquierdo: Selección de Método */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="premium-glass p-6 rounded-3xl relative overflow-hidden border border-app-border">
                        <h3 className="text-xl font-bold mb-6 text-white">Método de Conexión</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <button 
                                onClick={() => setActiveTab('public')}
                                className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'public' ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-app-border bg-app-card hover:bg-app-card/80'}`}
                            >
                                <Globe className={`mb-2 ${activeTab === 'public' ? 'text-emerald-400' : 'text-app-text-muted'}`} size={24} />
                                <div className="font-bold text-sm text-white">Opción A: Pública</div>
                                <div className="text-xs text-app-text-muted mt-1">Hoja abierta. Solo requiere el ID.</div>
                            </button>

                            <button 
                                onClick={() => setActiveTab('service_account')}
                                className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'service_account' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-app-border bg-app-card hover:bg-app-card/80'}`}
                            >
                                <KeyRound className={`mb-2 ${activeTab === 'service_account' ? 'text-blue-400' : 'text-app-text-muted'}`} size={24} />
                                <div className="font-bold text-sm text-white">Opción B: JSON</div>
                                <div className="text-xs text-app-text-muted mt-1">Cuenta de Servicio (Service Account).</div>
                            </button>

                            <button 
                                onClick={() => setActiveTab('oauth')}
                                className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'oauth' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-app-border bg-app-card hover:bg-app-card/80'}`}
                            >
                                <ShieldCheck className={`mb-2 ${activeTab === 'oauth' ? 'text-purple-400' : 'text-app-text-muted'}`} size={24} />
                                <div className="font-bold text-sm text-white">Opción C: OAuth</div>
                                <div className="text-xs text-app-text-muted mt-1">Inicio de sesión con Google (Requiere dominio).</div>
                            </button>
                        </div>

                        {/* Contenido Dinámico según el Tab */}
                        <div className="bg-app-card/50 p-6 rounded-2xl border border-app-border/50">
                            {activeTab === 'public' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                        <h4 className="font-bold text-emerald-400 flex items-center gap-2 mb-2"><Globe size={18} /> Hoja de Cálculo Pública</h4>
                                        <div className="text-sm text-emerald-100/80 space-y-2">
                                            <p className="font-bold">Instrucciones paso a paso:</p>
                                            <ol className="list-decimal pl-5 space-y-1">
                                                <li>Abre tu hoja de cálculo en Google Sheets.</li>
                                                <li>Haz clic en el botón verde <strong>"Compartir"</strong> arriba a la derecha.</li>
                                                <li>En la sección "Acceso general", cambia "Restringido" por <strong>"Cualquier persona con el enlace"</strong>.</li>
                                                <li>Asegúrate de que el rol a la derecha diga <strong>"Lector"</strong>.</li>
                                                <li>Copia el enlace o extrae el ID de la URL y pégalo abajo.</li>
                                            </ol>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-4">
                                        <label className="text-sm font-bold text-app-text-muted">ID de la Hoja de Cálculo (Spreadsheet ID)</label>
                                        <input 
                                            type="text" 
                                            value={settings.spreadsheetId || ''}
                                            onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value })}
                                            className="input-field font-mono text-cyan-400 text-sm w-full"
                                            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                        />
                                        <p className="text-xs text-app-text-muted">Es el código largo que aparece en la URL de tu Google Sheet.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'service_account' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-6">
                                        <h4 className="font-bold text-blue-400 flex items-center gap-2 mb-2"><KeyRound size={18} /> Cuenta de Servicio (Service Account)</h4>
                                        <div className="text-sm text-blue-100/80 space-y-2">
                                            <p className="font-bold">Instrucciones paso a paso:</p>
                                            <ol className="list-decimal pl-5 space-y-1">
                                                <li>Ve a Google Cloud Console, crea una <strong>Service Account</strong> y descarga la clave en formato JSON.</li>
                                                <li>Sube ese archivo <code>credentials.json</code> en el recuadro de abajo.</li>
                                                <li>Abre tu archivo <code>credentials.json</code> con un bloc de notas y copia el correo que aparece en la propiedad <code>client_email</code>.</li>
                                                <li>Abre tu Google Sheet privado, haz clic en <strong>Compartir</strong> y añade ese correo como <strong>"Lector"</strong> o "Editor".</li>
                                            </ol>
                                        </div>
                                    </div>
                                    
                                    <div className="border-2 border-dashed border-app-border rounded-2xl p-8 text-center hover:bg-app-card transition-colors">
                                        {uploadStatus === 'success' ? (
                                            <div className="flex flex-col items-center gap-3 text-emerald-400">
                                                <CheckCircle2 size={48} />
                                                <div className="font-bold">¡Credenciales instaladas!</div>
                                                <p className="text-sm text-app-text-muted">La Cuenta de Servicio está activa y lista para sincronizar.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                                                    <UploadCloud size={32} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white mb-1">Subir credentials.json</p>
                                                    <p className="text-sm text-app-text-muted mb-4">Selecciona el archivo JSON de tu Service Account</p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept=".json"
                                                    onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
                                                    className="text-sm text-app-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                                                />
                                                {jsonFile && (
                                                    <button 
                                                        onClick={handleUploadCredentials}
                                                        disabled={uploadStatus === 'uploading'}
                                                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                                                    >
                                                        {uploadStatus === 'uploading' ? 'Subiendo...' : 'Guardar Credenciales'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <label className="text-sm font-bold text-app-text-muted">ID de la Hoja de Cálculo (Spreadsheet ID)</label>
                                        <input 
                                            type="text" 
                                            value={settings.spreadsheetId || ''}
                                            onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value })}
                                            className="input-field font-mono text-cyan-400 text-sm w-full"
                                            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'oauth' && (
                                <div className="space-y-6 animate-fade-in text-center py-6">
                                    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mx-auto mb-4 border border-purple-500/30">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h4 className="text-xl font-bold text-white">OAuth 2.0 (Login de Google)</h4>
                                    <div className="text-app-text-muted text-sm max-w-lg mx-auto space-y-3 mt-4 text-left bg-app-bg p-4 rounded-xl border border-app-border">
                                        <p className="font-bold text-white">Instrucciones paso a paso:</p>
                                        <ol className="list-decimal pl-5 space-y-2">
                                            <li>Esta opción asocia tu cuenta de Google completa con el Bot. Al iniciar sesión, el bot podrá leer tus hojas privadas sin necesidad de configurar correos externos ni publicarlas.</li>
                                            <li>Para que Google permita el inicio de sesión, <strong className="text-yellow-500">es obligatorio que estés usando una URL segura (HTTPS)</strong>. Usa el enlace público del Cloudflare Tunnel de la sección de Configuración en lugar de usar `http://localhost`.</li>
                                            <li>Haz clic en el botón de abajo y aprueba los permisos que te pida Google.</li>
                                        </ol>
                                    </div>
                                    
                                    {!settings?.refreshToken ? (
                                        <div className="mt-8">
                                            <a 
                                                href="/api/sheets/auth/login"
                                                className="px-6 py-3 bg-white text-black rounded-xl font-bold transition-all hover:bg-gray-200 flex items-center justify-center gap-3 mx-auto w-max shadow-xl"
                                            >
                                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                                                Iniciar sesión con Google
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="mt-8 flex flex-col items-center gap-4">
                                            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-bold">
                                                ✅ Cuenta Vinculada Correctamente
                                            </div>
                                            <button type="button" onClick={() => {
                                                setSettings({...settings, refreshToken: null});
                                                handleSave();
                                            }} className="text-red-400 text-sm hover:underline font-bold flex items-center gap-1">
                                                <LogOut size={16} /> Desvincular Cuenta
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2 pt-6 text-left">
                                        <label className="text-sm font-bold text-app-text-muted">ID de la Hoja de Cálculo (Spreadsheet ID)</label>
                                        <input 
                                            type="text" 
                                            value={settings.spreadsheetId || ''}
                                            onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value })}
                                            className="input-field font-mono text-cyan-400 text-sm w-full"
                                            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button onClick={(e) => handleSave(e as any)} disabled={isSaving} className="btn-primary px-8">
                                {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Preferencias */}
                <div className="space-y-6">
                    <div className="premium-glass p-6 rounded-3xl relative border border-app-border">
                        <h3 className="text-lg font-bold mb-6 text-white border-b border-app-border pb-4">Preferencias de Sincronización</h3>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-app-text-muted">Intervalo Automático</label>
                                <select 
                                    value={settings.syncInterval || 'manual'}
                                    onChange={(e) => setSettings({ ...settings, syncInterval: e.target.value })}
                                    className="input-field w-full"
                                >
                                    <option value="manual">Manual (Solo botón)</option>
                                    <option value="15m">Cada 15 minutos</option>
                                    <option value="1h">Cada 1 hora</option>
                                    <option value="12h">Cada 12 horas</option>
                                </select>
                                <p className="text-[10px] text-app-text-muted">Define cada cuánto tiempo el bot descargará las últimas actualizaciones de la hoja.</p>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-app-border">
                                <h4 className="text-sm font-bold text-red-400 mb-2">Zona de Peligro</h4>
                                <button 
                                    onClick={handleClean}
                                    disabled={isCleaning}
                                    className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 rounded-xl font-bold transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCleaning ? 'Limpiando...' : 'Limpiar Datos Sincronizados'}
                                </button>
                                <p className="text-[10px] text-app-text-muted mt-2">
                                    Elimina del bot todas las auto-respuestas importadas desde Sheets. No afecta tus respuestas manuales.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Visor / Vista Previa */}
            <div className="premium-glass p-6 rounded-3xl relative overflow-hidden border border-app-border mt-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">Visor de Hoja (Vista Previa)</h3>
                        <p className="text-sm text-app-text-muted">Revisa cómo el bot está leyendo tu hoja de cálculo antes de sincronizar.</p>
                    </div>
                    <button 
                        onClick={handlePreview}
                        disabled={!settings.spreadsheetId || isPreviewing}
                        className="px-4 py-2 bg-app-card text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 rounded-xl font-bold transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isPreviewing ? 'animate-spin' : ''} />
                        {isPreviewing ? 'Cargando...' : 'Cargar Vista Previa'}
                    </button>
                </div>

                {!previewData && !isPreviewing && (
                    <div className="text-center py-8 text-app-text-muted text-sm border-2 border-dashed border-app-border rounded-2xl">
                        Haz clic en "Cargar Vista Previa" para previsualizar hasta 200 filas de tu Google Sheet.
                    </div>
                )}

                {previewData && previewData.length === 0 && (
                    <div className="text-center py-8 text-app-text-muted text-sm border-2 border-dashed border-app-border rounded-2xl">
                        La hoja parece estar vacía o no tiene el formato correcto (A: Palabra, B: Respuesta, C: Coincidencia 1 o 2).
                    </div>
                )}

                {previewData && previewData.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-app-border text-sm font-bold text-app-text-muted uppercase tracking-wider">
                                    <th className="pb-3 px-4">Palabra Clave (Col. A)</th>
                                    <th className="pb-3 px-4">Respuesta del Bot (Col. B)</th>
                                    <th className="pb-3 px-4">Coincidencia (Col. C)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {previewData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-app-border/50 hover:bg-app-card/50 transition-colors">
                                        <td className="py-3 px-4 font-mono text-cyan-400 font-bold">{row.keyword}</td>
                                        <td className="py-3 px-4 text-white whitespace-pre-wrap">{row.reply}</td>
                                        <td className="py-3 px-4 text-emerald-400 font-bold">{row.matchType}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 text-center text-[10px] uppercase font-bold tracking-widest text-emerald-500/70">
                            Mostrando las primeras {previewData.length} filas encontradas...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
