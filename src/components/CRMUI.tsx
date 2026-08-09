'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
    Briefcase, 
    Users, 
    Tags, 
    Search, 
    Plus, 
    Trash2, 
    Edit3, 
    Phone, 
    Mail, 
    FileText, 
    Download, 
    Upload, 
    ExternalLink, 
    Sparkles, 
    RefreshCw, 
    X, 
    Check, 
    Star, 
    Zap, 
    UserCheck, 
    AlertCircle, 
    Filter, 
    Clock, 
    MessageSquare, 
    ChevronDown,
    MoreVertical,
    CheckSquare,
    Square
} from 'lucide-react';

interface CRMTag {
    id: string;
    name: string;
    color: string;
    bgClass?: string;
    textClass?: string;
    borderClass?: string;
}

interface CRMContact {
    id: string;
    name: string;
    pushName?: string;
    phone?: string;
    tags: string[];
    notes?: string;
    email?: string;
    address?: string;
    customFields?: Record<string, string>;
    lastInteraction: number;
    firstInteraction?: number;
    messageCount: number;
    isGroup?: boolean;
}

interface CRMStats {
    total: number;
    vipCount: number;
    leadCount: number;
    clientCount: number;
    debtorCount: number;
    activeToday: number;
}

const PRESET_COLORS = [
    '#f59e0b', // Amber / Gold (VIP)
    '#10b981', // Emerald / Green (Lead)
    '#3b82f6', // Blue (Cliente)
    '#ef4444', // Red (Deudor / Alerta)
    '#a855f7', // Purple (Soporte)
    '#06b6d4', // Cyan (Mayorista)
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
    '#f97316'  // Orange
];

export default function CRMUI() {
    const [contacts, setContacts] = useState<CRMContact[]>([]);
    const [tags, setTags] = useState<CRMTag[]>([]);
    const [stats, setStats] = useState<CRMStats>({
        total: 0,
        vipCount: 0,
        leadCount: 0,
        clientCount: 0,
        debtorCount: 0,
        activeToday: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filtros y Búsqueda
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'name' | 'messages'>('recent');

    // Selección Múltiple
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modales
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Partial<CRMContact> | null>(null);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importResult, setImportResult] = useState<string | null>(null);

    // Crear / Editar Etiqueta
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
    const [editingTag, setEditingTag] = useState<CRMTag | null>(null);

    // Menú flotante de agregar tag rápido
    const [quickTagContactId, setQuickTagContactId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCRMData();
    }, []);

    const fetchCRMData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/crm');
            if (data.success) {
                setContacts(data.contacts || []);
                setTags(data.tags || []);
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching CRM data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrado y Ordenamiento
    const filteredContacts = useMemo(() => {
        return contacts
            .filter(c => {
                // Filtro por texto
                const query = searchQuery.toLowerCase().trim();
                const matchesText = !query || 
                    c.name?.toLowerCase().includes(query) ||
                    c.id?.toLowerCase().includes(query) ||
                    c.phone?.toLowerCase().includes(query) ||
                    c.email?.toLowerCase().includes(query) ||
                    c.notes?.toLowerCase().includes(query) ||
                    c.pushName?.toLowerCase().includes(query);

                if (!matchesText) return false;

                // Filtro por etiqueta
                if (selectedTagFilter === 'all') return true;
                if (selectedTagFilter === 'untagged') return !c.tags || c.tags.length === 0;
                return c.tags && c.tags.includes(selectedTagFilter);
            })
            .sort((a, b) => {
                if (sortBy === 'recent') {
                    return (b.lastInteraction || 0) - (a.lastInteraction || 0);
                }
                if (sortBy === 'name') {
                    return (a.name || a.id).localeCompare(b.name || b.id);
                }
                if (sortBy === 'messages') {
                    return (b.messageCount || 0) - (a.messageCount || 0);
                }
                return 0;
            });
    }, [contacts, searchQuery, selectedTagFilter, sortBy]);

    // Guardar / Editar Contacto
    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingContact?.id && !editingContact?.phone) return;

        setSaving(true);
        try {
            await axios.post('/api/crm/contact', editingContact);
            setIsEditModalOpen(false);
            setEditingContact(null);
            await fetchCRMData();
        } catch (error) {
            alert('Error al guardar el contacto');
        } finally {
            setSaving(false);
        }
    };

    // Eliminar Contacto
    const handleDeleteContact = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar al contacto "${name || id}" del CRM?`)) return;
        try {
            await axios.delete(`/api/crm/${id}`);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            await fetchCRMData();
        } catch (error) {
            alert('Error al eliminar contacto');
        }
    };

    // Agregar / Quitar Tag a un Contacto
    const handleToggleTag = async (contactId: string, tagId: string) => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return;

        const hasTag = contact.tags && contact.tags.includes(tagId);
        try {
            if (hasTag) {
                await axios.post('/api/crm/untag', { id: contactId, tag: tagId });
            } else {
                await axios.post('/api/crm/tag', { id: contactId, tag: tagId });
            }
            await fetchCRMData();
        } catch (error) {
            console.error('Error toggling tag:', error);
        }
    };

    // Crear o Editar Etiqueta
    const handleSaveTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;

        try {
            if (editingTag) {
                await axios.put(`/api/crm/tags/${editingTag.id}`, {
                    name: newTagName.trim(),
                    color: newTagColor
                });
                setEditingTag(null);
            } else {
                await axios.post('/api/crm/tags', {
                    name: newTagName.trim(),
                    color: newTagColor
                });
            }
            setNewTagName('');
            setNewTagColor(PRESET_COLORS[0]);
            await fetchCRMData();
        } catch (error) {
            alert('Error al guardar la etiqueta');
        }
    };

    const handleStartEditTag = (tag: CRMTag) => {
        setEditingTag(tag);
        setNewTagName(tag.name);
        setNewTagColor(tag.color);
    };

    const handleCancelEditTag = () => {
        setEditingTag(null);
        setNewTagName('');
        setNewTagColor(PRESET_COLORS[0]);
    };

    // Eliminar Etiqueta
    const handleDeleteTag = async (tagId: string, tagName: string) => {
        if (!confirm(`¿Eliminar la etiqueta "${tagName}"? Se quitará de todos los contactos.`)) return;
        try {
            await axios.delete(`/api/crm/tags/${tagId}`);
            if (selectedTagFilter === tagId) setSelectedTagFilter('all');
            await fetchCRMData();
        } catch (error) {
            alert('Error al eliminar la etiqueta');
        }
    };

    // Selección Múltiple
    const handleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredContacts.map(c => c.id)));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Acciones Masivas
    const handleBulkTag = async (tagId: string) => {
        if (selectedIds.size === 0) return;
        try {
            await axios.post('/api/crm/bulk-tag', {
                ids: Array.from(selectedIds),
                tag: tagId
            });
            await fetchCRMData();
        } catch (error) {
            alert('Error al asignar etiqueta en lote');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`¿Estás seguro de eliminar los ${selectedIds.size} contactos seleccionados?`)) return;
        try {
            await axios.post('/api/crm/bulk-delete', {
                ids: Array.from(selectedIds)
            });
            setSelectedIds(new Set());
            await fetchCRMData();
        } catch (error) {
            alert('Error al eliminar contactos en lote');
        }
    };

    // Exportar a CSV
    const handleExportCSV = () => {
        if (contacts.length === 0) {
            alert('No hay contactos para exportar');
            return;
        }

        const headers = ['ID/Teléfono', 'Nombre', 'Nombre WhatsApp', 'Email', 'Etiquetas', 'Notas', 'Mensajes', 'Ultima Interaccion'];
        const rows = contacts.map(c => [
            `"${c.id}"`,
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${(c.pushName || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.tags || []).join(', ')}"`,
            `"${(c.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            c.messageCount || 0,
            c.lastInteraction ? new Date(c.lastInteraction).toLocaleString() : ''
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `contactos_crm_botmare_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Importar Contactos desde Texto/CSV
    const handleImportContacts = async () => {
        if (!importText.trim()) return;

        setSaving(true);
        setImportResult(null);
        try {
            const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const parsedContacts: Partial<CRMContact>[] = [];

            for (const line of lines) {
                // Soporta formato: Teléfono, Nombre, [Tags separados por espacio o coma], [Notas]
                const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
                if (parts.length === 0) continue;

                const phone = parts[0].replace(/[^0-9]/g, '');
                if (!phone) continue;

                const name = parts[1] || phone;
                const tagString = parts[2] || 'lead';
                const tagsList = tagString.split(/[;|\s]+/).map(t => t.toLowerCase().trim()).filter(Boolean);
                const notes = parts.slice(3).join(', ') || '';

                parsedContacts.push({
                    id: phone,
                    name,
                    phone,
                    tags: tagsList.length > 0 ? tagsList : ['lead'],
                    notes
                });
            }

            if (parsedContacts.length === 0) {
                setImportResult('No se detectaron contactos válidos. Verifica el formato.');
                setSaving(false);
                return;
            }

            const res = await axios.post('/api/crm/import', { contacts: parsedContacts });
            if (res.data?.success) {
                setImportResult(`✅ ¡Éxito! Se importaron/actualizaron ${res.data.count} contactos.`);
                setImportText('');
                await fetchCRMData();
            }
        } catch (error: any) {
            setImportResult('❌ Error al procesar la importación.');
        } finally {
            setSaving(false);
        }
    };

    // Formatear Tiempo Relativo
    const formatTimeAgo = (timestamp?: number) => {
        if (!timestamp) return 'Sin interacción';
        const diffMs = Date.now() - timestamp;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSec < 60) return 'Hace un momento';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return new Date(timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    };

    // Obtener estilo de tag
    const getTagStyle = (tagId: string) => {
        const tag = tags.find(t => t.id === tagId || t.name.toLowerCase() === tagId.toLowerCase());
        if (tag) {
            return {
                style: { backgroundColor: `${tag.color}15`, borderColor: `${tag.color}40`, color: tag.color },
                name: tag.name
            };
        }
        return {
            style: { backgroundColor: '#8b5cf615', borderColor: '#8b5cf640', color: '#a78bfa' },
            name: tagId
        };
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border/30 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 rounded-2xl shadow-lg shadow-fuchsia-500/10">
                            <Briefcase className="w-7 h-7 text-fuchsia-400" />
                        </div>
                        CRM y Gestión de Clientes
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                        Perfilado automático de contactos, asignación de etiquetas personalizadas y segmentación comercial para WhatsApp.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => {
                            setEditingContact({
                                id: '',
                                name: '',
                                phone: '',
                                tags: ['lead'],
                                notes: '',
                                email: ''
                            });
                            setIsEditModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-fuchsia-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Contacto
                    </button>

                    <button
                        onClick={() => setIsTagModalOpen(true)}
                        className="px-3.5 py-2.5 bg-app-card hover:bg-app-border/40 border border-app-border/70 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                        title="Gestionar Etiquetas"
                    >
                        <Tags className="w-4 h-4 text-purple-400" />
                        Etiquetas
                    </button>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-3 py-2.5 bg-app-card hover:bg-app-border/40 border border-app-border/70 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                        title="Importar Contactos"
                    >
                        <Upload className="w-4 h-4 text-cyan-400" />
                        Importar
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="px-3 py-2.5 bg-app-card hover:bg-app-border/40 border border-app-border/70 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                        title="Descargar CSV"
                    >
                        <Download className="w-4 h-4 text-emerald-400" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-app-card/60 border border-app-border/40 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contactos</span>
                        <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{stats.total}</span>
                        <span className="text-xs text-slate-400 font-medium">registrados</span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-app-card/60 border border-app-border/40 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes VIP</span>
                        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                            <Star className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-400">{stats.vipCount}</span>
                        <span className="text-xs text-slate-400 font-medium">prioritarios</span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-app-card/60 border border-app-border/40 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads / Prospectos</span>
                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-400">{stats.leadCount}</span>
                        <span className="text-xs text-slate-400 font-medium">en seguimiento</span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-app-card/60 border border-app-border/40 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activos Hoy</span>
                        <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-cyan-400">{stats.activeToday}</span>
                        <span className="text-xs text-slate-400 font-medium">últimas 24h</span>
                    </div>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros de Etiquetas */}
            <div className="p-4 rounded-2xl bg-app-card/40 border border-app-border/40 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    {/* Input de Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono, email o notas..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#0b0f19] border border-app-border/70 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Ordenar Por */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ordenar:</span>
                        <select
                            value={sortBy}
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="px-3 py-2 bg-[#0b0f19] border border-app-border/70 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                        >
                            <option value="recent">Más Recientes</option>
                            <option value="name">Alfabético (A-Z)</option>
                            <option value="messages">Mayor N° Mensajes</option>
                        </select>
                    </div>
                </div>

                {/* Filtros de Etiquetas (Pills) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app-border/30">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filtrar:
                    </span>

                    <button
                        onClick={() => setSelectedTagFilter('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            selectedTagFilter === 'all'
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                : 'bg-[#0b0f19] text-slate-400 hover:text-white border border-app-border/60'
                        }`}
                    >
                        Todos ({contacts.length})
                    </button>

                    <button
                        onClick={() => setSelectedTagFilter('untagged')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            selectedTagFilter === 'untagged'
                                ? 'bg-purple-600 text-white'
                                : 'bg-[#0b0f19] text-slate-400 hover:text-white border border-app-border/60'
                        }`}
                    >
                        Sin Etiqueta
                    </button>

                    {tags.map(tag => {
                        const count = contacts.filter(c => c.tags && c.tags.includes(tag.id)).length;
                        const isSelected = selectedTagFilter === tag.id;
                        return (
                            <button
                                key={tag.id}
                                onClick={() => setSelectedTagFilter(isSelected ? 'all' : tag.id)}
                                style={isSelected ? { backgroundColor: tag.color, color: '#ffffff' } : { borderColor: `${tag.color}40`, color: tag.color }}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                    isSelected ? 'shadow-md' : 'bg-[#0b0f19] hover:opacity-90'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#ffffff' : tag.color }} />
                                {tag.name}
                                <span className="opacity-70 text-[10px]">({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Barra de Acciones Masivas Flotante */}
            {selectedIds.size > 0 && (
                <div className="p-3 bg-purple-950/80 border border-purple-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-lg animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-purple-200">
                            ✨ {selectedIds.size} {selectedIds.size === 1 ? 'contacto seleccionado' : 'contactos seleccionados'}
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-purple-400 hover:text-white underline cursor-pointer"
                        >
                            Deseleccionar todos
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Asignar Tag Rápido */}
                        <div className="relative group">
                            <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                                <Tags className="w-3.5 h-3.5" />
                                Asignar Etiqueta
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-[#111827] border border-app-border/80 rounded-xl p-2 shadow-2xl z-50 min-w-[160px] space-y-1">
                                {tags.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleBulkTag(t.id)}
                                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-purple-500/10 flex items-center gap-2 text-slate-200 hover:text-white"
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Eliminar Masivo */}
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            Eliminar
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla de Contactos */}
            {loading ? (
                <div className="p-12 text-center bg-app-card/30 rounded-2xl border border-app-border/30">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando base de datos de clientes...</p>
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="p-12 text-center bg-app-card/30 rounded-2xl border border-app-border/30 space-y-3">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto text-purple-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white">No se encontraron contactos</h3>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto">
                        {searchQuery || selectedTagFilter !== 'all'
                            ? 'Prueba cambiando los términos de búsqueda o el filtro de etiquetas.'
                            : 'Los contactos se registrarán automáticamente cuando te escriban a WhatsApp o puedes agregarlos manualmente.'}
                    </p>
                </div>
            ) : (
                <div className="bg-app-card/40 border border-app-border/40 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-app-border/40 bg-black/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="p-4 w-10">
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            {selectedIds.size === filteredContacts.length && filteredContacts.length > 0 ? (
                                                <CheckSquare className="w-4 h-4 text-purple-400" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-4">Contacto / Cliente</th>
                                    <th className="p-4">Teléfono & WhatsApp</th>
                                    <th className="p-4">Etiquetas (Tags)</th>
                                    <th className="p-4">Notas Internas</th>
                                    <th className="p-4">Último Mensaje</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border/30 text-xs">
                                {filteredContacts.map(contact => {
                                    const isSelected = selectedIds.has(contact.id);
                                    const initial = (contact.name || contact.id).charAt(0).toUpperCase();

                                    return (
                                        <tr 
                                            key={contact.id} 
                                            className={`hover:bg-purple-500/[0.04] transition-colors group ${
                                                isSelected ? 'bg-purple-500/[0.08]' : ''
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleToggleSelect(contact.id)}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-purple-400" />
                                                    ) : (
                                                        <Square className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                                    )}
                                                </button>
                                            </td>

                                            {/* Contacto & Avatar */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 border border-purple-500/30 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-inner">
                                                        {initial}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                                                            {contact.name || contact.id}
                                                            {contact.isGroup && (
                                                                <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">Grupo</span>
                                                            )}
                                                        </div>
                                                        {contact.pushName && contact.pushName !== contact.name && (
                                                            <p className="text-[11px] text-slate-400 truncate">
                                                                Alias: ~{contact.pushName}
                                                            </p>
                                                        )}
                                                        {contact.email && (
                                                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                                                                <Mail className="w-3 h-3 shrink-0" /> {contact.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Teléfono */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-purple-300">{contact.phone || contact.id}</span>
                                                    <a
                                                        href={`https://wa.me/${contact.phone || contact.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                        title="Abrir WhatsApp Web"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Tags */}
                                            <td className="p-4">
                                                <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                                                    {contact.tags && contact.tags.map(tagId => {
                                                        const tagInfo = getTagStyle(tagId);
                                                        return (
                                                            <span
                                                                key={tagId}
                                                                style={tagInfo.style}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1"
                                                            >
                                                                {tagInfo.name}
                                                                <button
                                                                    onClick={() => handleToggleTag(contact.id, tagId)}
                                                                    className="hover:opacity-70"
                                                                    title="Quitar etiqueta"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        );
                                                    })}

                                                    {/* Botón rápido +Tag */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setQuickTagContactId(quickTagContactId === contact.id ? null : contact.id)}
                                                            className="px-1.5 py-0.5 rounded-md bg-[#0b0f19] hover:bg-purple-500/20 border border-dashed border-app-border hover:border-purple-500/40 text-slate-400 hover:text-purple-300 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                                                        >
                                                            <Plus className="w-2.5 h-2.5" /> Tag
                                                        </button>

                                                        {quickTagContactId === contact.id && (
                                                            <div className="absolute left-0 top-full mt-1 bg-[#111827] border border-app-border/80 rounded-xl p-2 shadow-2xl z-50 min-w-[150px] space-y-1 animate-in fade-in zoom-in-95">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">Asignar Tag:</p>
                                                                {tags.map(t => {
                                                                    const hasThisTag = contact.tags?.includes(t.id);
                                                                    return (
                                                                        <button
                                                                            key={t.id}
                                                                            onClick={() => {
                                                                                handleToggleTag(contact.id, t.id);
                                                                                setQuickTagContactId(null);
                                                                            }}
                                                                            className="w-full text-left px-2 py-1 text-[11px] rounded-lg hover:bg-purple-500/10 flex items-center justify-between text-slate-200"
                                                                        >
                                                                            <span className="flex items-center gap-1.5">
                                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                                                                {t.name}
                                                                            </span>
                                                                            {hasThisTag && <Check className="w-3 h-3 text-emerald-400" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Notas */}
                                            <td className="p-4 max-w-xs">
                                                {contact.notes ? (
                                                    <p 
                                                        className="text-slate-300 truncate cursor-pointer hover:text-white"
                                                        onClick={() => {
                                                            setEditingContact(contact);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        title={contact.notes}
                                                    >
                                                        📝 {contact.notes}
                                                    </p>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingContact(contact);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="text-slate-500 hover:text-slate-300 text-[11px] italic"
                                                    >
                                                        + Añadir nota
                                                    </button>
                                                )}
                                            </td>

                                            {/* Último Mensaje & Contador */}
                                            <td className="p-4">
                                                <div className="space-y-0.5">
                                                    <span className="text-slate-300 block">{formatTimeAgo(contact.lastInteraction)}</span>
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <MessageSquare className="w-2.5 h-2.5" /> {contact.messageCount || 0} msgs
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setEditingContact(contact);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-1.5 hover:bg-app-card rounded-lg text-slate-400 hover:text-purple-400 transition-colors"
                                                        title="Editar datos y notas"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                                                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                        title="Eliminar contacto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Editar / Nuevo Contacto */}
            {isEditModalOpen && editingContact && (
                <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-app-border/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-app-border/50 flex items-center justify-between bg-app-card/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400">
                                    <Edit3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">
                                        {editingContact.id ? 'Editar Ficha de Contacto' : 'Nuevo Contacto CRM'}
                                    </h2>
                                    <p className="text-xs text-slate-400">Datos comerciales y notas internas</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveContact} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Nombre / Razón Social
                                    </label>
                                    <input
                                        type="text"
                                        value={editingContact.name || ''}
                                        onChange={e => setEditingContact({ ...editingContact, name: e.target.value })}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full px-3.5 py-2 bg-[#0b0f19] border border-app-border/70 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Teléfono / WhatsApp ID *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editingContact.phone || editingContact.id || ''}
                                        onChange={e => setEditingContact({ 
                                            ...editingContact, 
                                            phone: e.target.value.replace(/[^0-9]/g, ''),
                                            id: e.target.value.replace(/[^0-9]/g, '')
                                        })}
                                        placeholder="Ej: 5219991234567"
                                        className="w-full px-3.5 py-2 bg-[#0b0f19] border border-app-border/70 rounded-xl text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={editingContact.email || ''}
                                        onChange={e => setEditingContact({ ...editingContact, email: e.target.value })}
                                        placeholder="cliente@ejemplo.com"
                                        className="w-full px-3.5 py-2 bg-[#0b0f19] border border-app-border/70 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Dirección / Ciudad
                                    </label>
                                    <input
                                        type="text"
                                        value={editingContact.address || ''}
                                        onChange={e => setEditingContact({ ...editingContact, address: e.target.value })}
                                        placeholder="Ciudad de México"
                                        className="w-full px-3.5 py-2 bg-[#0b0f19] border border-app-border/70 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Etiquetas */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Etiquetas Asignadas
                                </label>
                                <div className="flex flex-wrap gap-2 p-3 bg-[#0b0f19] border border-app-border/70 rounded-xl">
                                    {tags.map(t => {
                                        const isChecked = editingContact.tags?.includes(t.id);
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    const current = editingContact.tags || [];
                                                    const updated = isChecked 
                                                        ? current.filter(x => x !== t.id)
                                                        : [...current, t.id];
                                                    setEditingContact({ ...editingContact, tags: updated });
                                                }}
                                                style={isChecked ? { backgroundColor: t.color, color: '#fff' } : { borderColor: `${t.color}40`, color: t.color }}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                    isChecked ? 'shadow-md' : 'bg-transparent hover:opacity-80'
                                                }`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isChecked ? '#fff' : t.color }} />
                                                {t.name}
                                                {isChecked && <Check className="w-3 h-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notas Internas */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Notas y Observaciones Comerciales
                                </label>
                                <textarea
                                    rows={3}
                                    value={editingContact.notes || ''}
                                    onChange={e => setEditingContact({ ...editingContact, notes: e.target.value })}
                                    placeholder="Detalles sobre compras, preferencias, cotizaciones pendientes..."
                                    className="w-full p-3 bg-[#0b0f19] border border-app-border/70 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-app-border/40">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 bg-app-card hover:bg-app-border/50 text-slate-300 rounded-xl text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                                >
                                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    Guardar Contacto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Gestión de Etiquetas */}
            {isTagModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-app-border/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-app-border/50 flex items-center justify-between bg-app-card/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400">
                                    <Tags className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Gestor de Etiquetas</h2>
                                    <p className="text-xs text-slate-400">Crea categorías y colores para tus prospectos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTagModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Crear / Editar Etiqueta */}
                            <form onSubmit={handleSaveTag} className="space-y-3 p-4 bg-[#0b0f19] border border-app-border/70 rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                        {editingTag ? `✏️ Modificar Etiqueta: ${editingTag.name}` : 'Crear Nueva Etiqueta'}
                                    </label>
                                    {editingTag && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEditTag}
                                            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                                        >
                                            Cancelar Edición
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ej: Mayorista Premium"
                                        value={newTagName}
                                        onChange={e => setNewTagName(e.target.value)}
                                        className="flex-1 px-3.5 py-2 bg-[#111827] border border-app-border/70 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                    <button
                                        type="submit"
                                        className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0 ${
                                            editingTag ? 'bg-amber-600 hover:bg-amber-500' : 'bg-purple-600 hover:bg-purple-500'
                                        }`}
                                    >
                                        {editingTag ? 'Guardar Cambios' : 'Agregar'}
                                    </button>
                                </div>

                                {/* Selector de Color */}
                                <div>
                                    <span className="text-[11px] text-slate-400 block mb-1.5">Color temático:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setNewTagColor(c)}
                                                style={{ backgroundColor: c }}
                                                className={`w-6 h-6 rounded-full transition-transform ${
                                                    newTagColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0b0f19]' : 'hover:scale-110'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </form>

                            {/* Lista de Etiquetas Actuales */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                    Etiquetas Activas ({tags.length})
                                </label>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {tags.map(tag => {
                                        const count = contacts.filter(c => c.tags && c.tags.includes(tag.id)).length;
                                        const isBeingEdited = editingTag?.id === tag.id;
                                        return (
                                            <div
                                                key={tag.id}
                                                className={`p-2.5 bg-[#0b0f19] border rounded-xl flex items-center justify-between transition-all ${
                                                    isBeingEdited ? 'border-amber-500/60 bg-amber-500/5' : 'border-app-border/60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                                    <span className="text-xs font-bold text-white">{tag.name}</span>
                                                    <span className="text-[10px] text-slate-400 bg-app-card px-1.5 py-0.5 rounded">
                                                        {count} {count === 1 ? 'contacto' : 'contactos'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleStartEditTag(tag)}
                                                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                                                        title="Editar nombre y color"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                        title="Eliminar etiqueta"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Importar Contactos */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-app-border/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-app-border/50 flex items-center justify-between bg-app-card/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Importador de Contactos</h2>
                                    <p className="text-xs text-slate-400">Carga rápida por texto o archivo CSV</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsImportModalOpen(false);
                                    setImportResult(null);
                                }}
                                className="p-2 text-slate-400 hover:text-white rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 space-y-1">
                                <p className="font-bold">Formato recomendado (uno por línea):</p>
                                <code className="block font-mono bg-black/30 p-1.5 rounded text-[11px] text-slate-300">
                                    5219991234567, Juan Perez, vip cliente, Interesado en catalogo
                                </code>
                                <p className="text-[10px] text-slate-400">Estructura: [Teléfono], [Nombre], [Etiquetas], [Notas opcionales]</p>
                            </div>

                            <textarea
                                rows={6}
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                placeholder="Pega aquí tus contactos línea por línea..."
                                className="w-full p-3 bg-[#0b0f19] border border-app-border/70 rounded-xl font-mono text-xs text-emerald-400 focus:outline-none focus:border-cyan-500 leading-relaxed"
                            />

                            {importResult && (
                                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                                    {importResult}
                                </div>
                            )}

                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-app-border/40">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsImportModalOpen(false);
                                        setImportResult(null);
                                    }}
                                    className="px-4 py-2 bg-app-card hover:bg-app-border/50 text-slate-300 rounded-xl text-sm font-semibold"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImportContacts}
                                    disabled={saving || !importText.trim()}
                                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    Procesar e Importar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
