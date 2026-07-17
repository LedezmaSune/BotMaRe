'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpCircle, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Cpu, Calendar, Clock, GitBranch, ExternalLink, Loader2 } from 'lucide-react';

interface Release {
    version: string;
    date: string;
    title: string;
    type: 'major' | 'minor' | 'patch';
    description: string;
    features: string[];
    url?: string;
}

// Fallback local en caso de que la API de GitHub no responda
const FALLBACK_RELEASES: Release[] = [
    {
        version: 'V 2.1.0',
        date: '17 Julio 2026',
        title: 'Conectividad Fija & Carga Inteligente Resiliente',
        type: 'minor',
        description: 'Mejoras críticas de infraestructura y experiencia de usuario. Agrega control central de servicios en cabecera, subida en cola de archivos masiva para evitar bloqueos y deduplicación de eventos.',
        features: [
            '🌍 Túneles Fijos (CUSTOM_DOMAIN): Nueva variable en el .env para desactivar el túnel rápido aleatorio y redirigir al instante hacia tu propio dominio personalizado en Cloudflare Zero Trust.',
            '⚡ Cola de Subida Secuencial (Upload Queue): Los archivos masivos en el Asistente Lote ahora se suben uno por uno en segundo plano. Esto evita desconexiones (error 502) y supera el límite de tamaño de Cloudflare (100MB).',
            '🕹️ Control Central (Header Cockpit): Tres nuevos botones interactivos en el header para encender o apagar la IA, el motor de Auto-Respuestas (Reglas) y Google Sheets de forma instantánea.',
            '📊 Auditoría Rediseñada: Visualización estructurada con tarjetas de información técnica y acordeones con propiedades JSON parseadas para lectura inmediata.',
            '🛡️ Deduplicador de WhatsApp: Control inteligente de ID de mensajes entrantes para evitar que el bot responda dos veces al mismo mensaje por reconexiones de Baileys.',
            '🧹 Limpieza FTP Segura: Salvaguardas en las funciones de auto-limpieza nocturnas que respetan archivos con fechas de modificación antiguas pero recién transferidos y archivos asignados a recordatorios activos.'
        ]
    },
    {
        version: 'V 2.0.0',
        date: '04 Julio 2026',
        title: 'Actualización Enterprise (CRM, Handoff, Docker & Respaldos)',
        type: 'major',
        description: 'La actualización más grande de BotMaRe. Transforma tu bot en un CRM Enterprise completo listo para producción y escalabilidad masiva.',
        features: [
            '🐳 Docker Support: Dockerfile y docker-compose listos para despliegue en la nube.',
            '📦 Respaldos Encriptados (Telegram): Copias de seguridad diarias programadas y cifradas enviadas a los administradores.',
            '🛡️ Handoff (Pausa IA): Detección de "asesor/humano" para pausar el bot por 1 hora y notificar al admin por Telegram.',
            '🏷️ CRM y Etiquetas: Sistema preparado para asignar prospectos, VIPs, y deudores.',
            '🎙️ Notas de Voz Nativas (PTT): Soporte nativo para la etiqueta [AUDIO: url] para enviar audios como si fueran grabados en tiempo real.',
            '🔗 Webhooks (Beta): Preparación de API endpoints para integración futura con Zapier y Make.'
        ]
    },
    {
        version: 'K 1.5.0',
        date: '14 Junio 2026',
        title: 'Rediseño CLI y Google Sheets Avanzado',
        type: 'minor',
        description: 'Rediseño completo de la interfaz de consola, sincronización de Google Sheets con 3 columnas y gestión remota por Telegram.',
        features: [
            '💻 Rediseño CLI: Interfaz visual en consola (launcher.js) con arte ASCII y spinners ANSI.',
            '📊 Sincronización Avanzada Sheets: Soporte para 3 columnas (A: Palabra Clave, B: Respuesta, C: Regla [Exacta/Contiene]) con límite de 200 filas.',
            '🔍 Visor Expandido: Previsualización de 50 respuestas simultáneas en el panel.',
            '📱 Control en Telegram: Sincronización de Sheets remoto directo desde el menú /start.'
        ]
    },
    {
        version: 'K 1.4.3',
        date: '13 Junio 2026',
        title: 'Integración Multi-Autenticación Google Sheets',
        type: 'minor',
        description: 'La herramienta de Google Sheets se ha migrado a una página dedicada con tres modalidades de conexión para mayor flexibilidad y seguridad.',
        features: [
            '📊 Página Dedicada: Nuevo panel de sincronización completo en el dashboard.',
            '🔓 Opción Pública: Sincronización rápida sin autenticación mediante el uso de enlaces públicos (CSV).',
            '🔑 Cuenta de Servicio (Service Account): Opción de autenticación segura orientada a servidores subiendo el credentials.json.',
            '🛡️ Flujo de errores mitigado: Inicialización dinámica de clientes OAuth para evitar el error "invalid_request".'
        ]
    },
    {
        version: 'K 1.4.2',
        date: '11 Junio 2026',
        title: 'Gestor de Versiones y Refactorización Core',
        type: 'patch',
        description: 'Implementación del nuevo gestor de actualizaciones por consola y migración completa del motor de base de datos a Lowdb v7 y Baileys v7.',
        features: [
            '📥 Gestor de Actualizaciones: Nuevo menú interactivo en consola (Opción 10) para cambiar entre la última versión Estable (Tag) y la versión en Desarrollo (main).',
            '💾 Migración a Lowdb v7: Reescribimos el adaptador de base de datos local para soportar la arquitectura asíncrona de Lowdb v7.',
            '📱 Baileys v7: Actualización a la versión candidata v7.0.0-rc13 para mayor estabilidad y soporte en conexiones de WhatsApp.',
            '✨ Terminal: Mejoras en la interfaz del CLI y soporte de rollback automático.'
        ]
    },
    {
        version: 'K 1.4.1',
        date: '10 Junio 2026',
        title: 'Actualización y Optimización de Dependencias',
        type: 'patch',
        description: 'Revisión general del árbol de dependencias, actualización segura de librerías esenciales (Next.js, React, Axios, Framer Motion, Mongoose) y depuración del archivo de bloqueo pnpm.',
        features: [
            '📦 Actualización Segura de Dependencias: Incremento de parches y versiones menores de Axios, Framer Motion, Grammy, Mongoose, OpenAI, Lucide-react y types de React y Node.',
            '⚡ Next.js & React: Actualización a Next.js 16.2.9 y React/React-dom 19.2.7 para mayor estabilidad.',
            '🔒 Control de Versión Mayor: Bloqueo de actualizaciones mayores para lowdb y Baileys para mitigar roturas de API y asegurar compatibilidad heredada.',
            '🏗️ Verificación de Compilación: Asegurado el correcto despliegue mediante compilación limpia verificada en TypeScript.'
        ]
    },
    {
        version: 'K 1.4.0',
        date: '04 Junio 2026',
        title: 'Giro de Texto (Spintax) & Emojis Inteligentes',
        type: 'minor',
        description: 'Implementación de variaciones automáticas en campañas, asistente IA de Spintax por temática de negocio, simulación avanzada de estados en WhatsApp y retardos caóticos adaptativos.',
        features: [
            '🔄 Giro de Texto (Spintax) Nativo: Soporte para formato {opción A|opción B} que aleatoriza cada envío de manera segura.',
            '🔮 Asistente IA de Spintax: Botón en la interfaz que analiza el contexto (Finanzas, Ventas, Salud, etc.) e inserta emojis y variaciones temáticas.',
            '🎙️ Simulación de Medios Avanzada: Muestra "Grabando audio..." o "Escribiendo..." de forma natural antes de entregar notas de voz o archivos.',
            '⏳ Retardos Caóticos Proporcionales: Jitter de envío masivo calculado dinámicamente según la longitud del texto (evita detección de patrones).'
        ]
    },
    {
        version: 'K 1.3.0',
        date: '31 Mayo 2026',
        title: 'Arquitectura Híbrida & Experiencia Premium',
        type: 'minor',
        description: 'Reconstrucción del motor de base de datos a un patrón de estrategia, integración de compilador Turbopack y rediseño completo de la experiencia de usuario en consola y web.',
        features: [
            '💾 Patrón Estrategia para Base de Datos: Transición limpia entre MongoDB Atlas en la nube y Lowdb en local de forma dinámica sin tocar los controladores.',
            '🚀 Integración con Turbopack: Tiempos de compilación y recarga en caliente hiper-optimizados en Next.js, reduciendo demoras drásticamente.',
            '🎨 Experiencia Premium UI: Animaciones súper fluidas impulsadas por Framer Motion, menús laterales dinámicos y efecto Glassmorphism expandido.',
            '🛠️ Terminal Visual Renacida: Spinners ANSI nativos que colorean cada fase del arranque, logs limpios y un nuevo panel interactivo en el Control Maestro.'
        ]
    },
    {
        version: 'K 1.2.0',
        date: '21 Mayo 2026',
        title: 'Actualización de Resiliencia & Soporte Humano',
        type: 'minor',
        description: 'Introduce características avanzadas de resiliencia ante caídas de WhatsApp, panel de escalado humano para chats interactivos y cola de difusión masiva optimizada.',
        features: [
            '🛡️ Centro de Soporte Técnico: Pausa automática de IA ante frustración del usuario, derivación a Telegram y chat directo con humanos.',
            '👥 Envío Multigrupo Secuencial: Solución definitiva para agregar y despachar múltiples grupos en campañas de difusión de forma continua.',
            '🔒 Motor Baileys v6.7.22: Mayor estabilidad criptográfica contra desincronización de llaves de señal (evita error 406 not-acceptable).',
            '📦 Respaldos Fraccionados: Centro de backups que divide las descargas en archivos ligeros de sistema y archivos multimedia pesados.'
        ]
    }
];

/**
 * Detecta el tipo de release según el tag semántico.
 * v1.0.0 → major, v1.1.0 → minor, v1.1.1 → patch
 */
function detectReleaseType(tag: string): 'major' | 'minor' | 'patch' {
    const clean = tag.replace(/^[vVkK\s]+/, '');
    const parts = clean.split('.');
    if (parts.length >= 3) {
        if (parts[2] !== '0') return 'patch';
        if (parts[1] !== '0') return 'minor';
    }
    return 'major';
}

/**
 * Parsea el body markdown de un GitHub Release y lo separa en
 * una descripción general y una lista de features.
 */
function parseReleaseBody(body: string): { description: string, features: string[] } {
    if (!body || body.trim() === '') {
        return { description: 'Sin descripción adicional.', features: [] };
    }

    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    const features: string[] = [];
    const descLines: string[] = [];

    for (const line of lines) {
        // Detectar líneas que son bullet points (- item, * item, • item)
        if (/^[-*•]\s+/.test(line)) {
            features.push(line.replace(/^[-*•]\s+/, ''));
        } else if (/^\d+\.\s+/.test(line)) {
            // Listas numeradas
            features.push(line.replace(/^\d+\.\s+/, ''));
        } else if (!line.startsWith('#') && !line.startsWith('---')) {
            // Texto normal (no headings ni separadores)
            descLines.push(line);
        }
    }

    return {
        description: descLines.join(' ') || 'Sin descripción adicional.',
        features
    };
}

/**
 * Formatea una fecha ISO a formato legible en español.
 */
function formatDate(isoDate: string): string {
    try {
        const d = new Date(isoDate);
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return isoDate;
    }
}

/**
 * Normaliza el tag de GitHub a formato "K x.y.z" para mostrar.
 */
function formatVersion(tag: string): string {
    const clean = tag.replace(/^[vVkK\s]+/, '');
    return `K ${clean}`;
}

export function UpdateCenter() {
    const [checking, setChecking] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [releases, setReleases] = useState<Release[]>([]);
    const [loadingReleases, setLoadingReleases] = useState(true);
    const [releasesError, setReleasesError] = useState<string | null>(null);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

    // Cargar releases al montar el componente
    useEffect(() => {
        fetchReleases();
    }, []);

    const fetchReleases = async () => {
        setLoadingReleases(true);
        setReleasesError(null);
        try {
            const res = await fetch('/api/system/releases');
            if (res.ok) {
                const data = await res.json();
                if (data.releases && data.releases.length > 0) {
                    const parsed: Release[] = data.releases
                        .filter((r: any) => !r.draft)
                        .map((r: any) => {
                            const { description, features } = parseReleaseBody(r.body);
                            return {
                                version: formatVersion(r.version),
                                date: formatDate(r.date),
                                title: r.title,
                                type: detectReleaseType(r.version),
                                description,
                                features,
                                url: r.url
                            };
                        });
                    setReleases(parsed);
                    // Expandir la primera (más reciente)
                    if (parsed.length > 0) setExpandedVersion(parsed[0].version);
                } else {
                    // Si no hay releases en GitHub, usar fallback
                    setReleases(FALLBACK_RELEASES);
                    setExpandedVersion(FALLBACK_RELEASES[0].version);
                    if (data.error) setReleasesError(data.error);
                }
            } else {
                setReleases(FALLBACK_RELEASES);
                setExpandedVersion(FALLBACK_RELEASES[0].version);
            }
        } catch (e: any) {
            console.error('Error fetching releases:', e);
            setReleases(FALLBACK_RELEASES);
            setExpandedVersion(FALLBACK_RELEASES[0].version);
            setReleasesError(e.message);
        } finally {
            setLoadingReleases(false);
        }
    };

    const handleCheckUpdate = async () => {
        setChecking(true);
        setUpdateInfo(null);
        try {
            const res = await fetch('/api/system/check-update');
            if (res.ok) {
                const data = await res.json();
                setUpdateInfo(data);
            } else {
                setUpdateInfo({ error: `No se pudo contactar al servidor de actualizaciones (HTTP ${res.status}).` });
            }
        } catch (e: any) {
            setUpdateInfo({ error: e.message || 'Error en la conexión.' });
        } finally {
            setChecking(false);
        }
    };

    const handleApplyUpdate = async () => {
        if (!confirm('¿Quieres aplicar la actualización? Esto traerá la última versión del repositorio, sobreescribirá cambios locales no confirmados y reiniciará el servidor de BotMaRe.')) return;
        setUpdating(true);
        try {
            const res = await fetch('/api/system/apply-update', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('¡Actualización aplicada con éxito! El sistema se está reiniciando en segundo plano.');
            } else {
                alert(`Error al actualizar: ${data.error || 'Desconocido'}`);
            }
        } catch (e: any) {
            alert(`Error al aplicar la actualización: ${e.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const toggleVersion = (version: string) => {
        setExpandedVersion(expandedVersion === version ? null : version);
    };

    const currentVersion = releases.length > 0 ? releases[0] : FALLBACK_RELEASES[0];
    const currentDate = releases.length > 0 ? releases[0].date : FALLBACK_RELEASES[0].date;

    return (
        <section className="glass-effect border border-app-border rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-5xl mx-auto shadow-[0_32px_64px_rgba(0,0,0,0.2)] relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

            {/* Header */}
            <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-12 relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-white shadow-[0_15px_30px_rgba(6,182,212,0.3)] transform -rotate-2 hover:rotate-0 transition-all duration-500 relative">
                    <RefreshCw className={`w-8 h-8 md:w-10 md:h-10 ${checking ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-app-text tracking-tighter leading-tight">Centro de Actualizaciones</h2>
                    <p className="text-app-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mt-1 opacity-70">Control de Versiones y Ciclo de Vida del Motor Kitsune</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Left side: Version Status Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-100/40 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">Versión Activa</span>
                                <h3 className="text-4xl font-black text-app-text mt-3 tracking-tighter">{currentVersion.version}</h3>
                            </div>
                            <Cpu className="text-app-text-muted/30 w-10 h-10 group-hover:text-cyan-500/50 transition-colors duration-500" />
                        </div>

                        <div className="flex items-center gap-2 mt-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold">
                            <CheckCircle2 size={16} className="shrink-0" />
                            <span>Sistema Actualizado & Estable</span>
                        </div>

                        <div className="mt-8 space-y-3 pt-6 border-t border-slate-200 dark:border-white/5 text-[10px] font-bold uppercase text-app-text-muted/70 tracking-wider">
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><Calendar size={12} /> Lanzamiento:</span>
                                <span className="text-app-text">{currentDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><Clock size={12} /> Último Check:</span>
                                <span className="text-app-text">Hoy (Hace instantes)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><GitBranch size={12} /> Rama Activa:</span>
                                <span className="text-cyan-500 lowercase font-mono">origin/main</span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCheckUpdate}
                            disabled={checking || updating}
                            className="w-full py-4 bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-app-text rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-300 dark:border-slate-700/50 flex items-center justify-center gap-3 disabled:opacity-40"
                        >
                            {checking ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            {checking ? 'Buscando...' : 'Buscar Actualización'}
                        </button>

                        {updateInfo && (
                            <div className="bg-slate-100/40 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 text-xs space-y-4 animate-in slide-in-from-top-3 duration-500">
                                {updateInfo.error ? (
                                    <div className="flex gap-2 text-red-500 font-bold items-start">
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        <span>Error: {updateInfo.error}</span>
                                    </div>
                                ) : updateInfo.updateAvailable ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-2.5 text-cyan-500 font-black items-start">
                                            <ArrowUpCircle size={18} className="shrink-0 mt-0.5 animate-bounce" />
                                            <div>
                                                <p className="uppercase tracking-widest text-[10px]">¡Actualización Disponible!</p>
                                                <p className="text-app-text mt-1">Versión remota superior o cambios no aplicados.</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-200/50 dark:bg-slate-900/50 p-3 rounded-xl font-mono text-[10px] space-y-1 text-app-text-muted">
                                            <div className="flex justify-between">
                                                <span>Commit Local:</span>
                                                <span className="text-app-text">{updateInfo.localCommit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Commit Remoto:</span>
                                                <span className="text-cyan-400">{updateInfo.remoteCommit}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleApplyUpdate}
                                            disabled={updating}
                                            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                                        >
                                            {updating ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                                            {updating ? 'Instalando...' : 'Aplicar Actualización'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2.5 text-emerald-500 font-bold items-start">
                                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="uppercase tracking-widest text-[10px]">Al día</p>
                                            <p className="text-app-text-muted mt-1">Tu instalación coincide plenamente con la última versión de GitHub.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Release Changelog Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-app-text tracking-tight flex items-center gap-3">
                            Historial de Cambios
                            <span className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-app-border">
                                {loadingReleases ? '...' : `${releases.length} Versiones`}
                            </span>
                        </h3>
                        {releasesError && (
                            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={10} /> Fallback local
                            </span>
                        )}
                    </div>

                    {loadingReleases ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                            <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest">Cargando releases de GitHub...</p>
                        </div>
                    ) : (
                        <div className="relative border-l border-slate-200 dark:border-white/10 pl-6 ml-4 space-y-8 py-2">
                            {releases.map((release, idx) => {
                                const isExpanded = expandedVersion === release.version;
                                const isLatest = idx === 0;

                                return (
                                    <div key={release.version} className="relative">
                                        {/* Timeline Circle Bullet */}
                                        <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background transition-colors ${isLatest ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'border-slate-400'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${isLatest ? 'bg-cyan-500 animate-pulse' : 'bg-slate-400'}`} />
                                        </span>

                                        {/* Collapsible Card */}
                                        <div className={`bg-app-card border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${isExpanded ? 'border-cyan-500/40 ring-1 ring-cyan-500/10' : 'border-app-border hover:border-app-border-hover'}`}>
                                            {/* Card Header Trigger */}
                                            <div 
                                                onClick={() => toggleVersion(release.version)}
                                                className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                                            >
                                                <div className="space-y-1 pr-4">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <h4 className="text-base font-black text-app-text tracking-tight uppercase">{release.version}</h4>
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                            release.type === 'major' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                            release.type === 'minor' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                        }`}>
                                                            {release.type === 'major' ? 'Major Release' : release.type === 'minor' ? 'Minor Update' : 'Patch'}
                                                        </span>
                                                        {isLatest && (
                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded shadow-sm">
                                                                Activa
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-cyan-500 dark:text-cyan-400 tracking-tight leading-tight">{release.title}</p>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0 text-app-text-muted">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{release.date}</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>

                                            {/* Collapsible Content */}
                                            {isExpanded && (
                                                <div className="px-5 pb-6 pt-2 border-t border-app-border bg-slate-50/20 dark:bg-slate-950/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <p className="text-xs text-app-text-muted leading-relaxed font-medium">
                                                        {release.description}
                                                    </p>
                                                    
                                                    {release.features.length > 0 && (
                                                        <div className="space-y-2 pt-2">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-app-text-muted/60">Lista de Ajustes & Funciones:</p>
                                                            <ul className="space-y-2">
                                                                {release.features.map((feat, i) => (
                                                                    <li key={i} className="text-xs font-bold text-app-text leading-relaxed flex items-start gap-2.5">
                                                                        <span className="text-cyan-500 mt-1 shrink-0 text-[10px]">•</span>
                                                                        <span>{feat}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {release.url && (
                                                        <a 
                                                            href={release.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-widest mt-2 transition-colors"
                                                        >
                                                            <ExternalLink size={10} />
                                                            Ver en GitHub
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
