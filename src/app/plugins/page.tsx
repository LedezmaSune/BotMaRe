'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PluginsPage() {
    const [plugins, setPlugins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlugin, setEditingPlugin] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchPlugins();
    }, []);

    const fetchPlugins = async () => {
        try {
            const { data } = await axios.get('/api/plugins');
            if (data.success) {
                setPlugins(data.plugins);
            }
        } catch (error) {
            console.error('Error fetching plugins', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlugin?.id || !editingPlugin?.code) return;
        
        try {
            await axios.post('/api/plugins', {
                id: editingPlugin.id,
                code: editingPlugin.code
            });
            setIsModalOpen(false);
            setEditingPlugin(null);
            fetchPlugins();
        } catch (error) {
            alert('Error al guardar el plugin');
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
        if (!confirm('¿Estás seguro de que deseas eliminar este plugin?')) return;
        try {
            await axios.delete(`/api/plugins/${id}`);
            fetchPlugins();
        } catch (error) {
            alert('Error al eliminar el plugin');
        }
    };

    const openNewModal = () => {
        setEditingPlugin({
            id: '',
            code: `module.exports = {
    name: "Mi Nuevo Plugin",
    description: "Una descripción breve",
    active: true,
    onMessage: async (ctx, api) => {
        if (ctx.text === '!ping') {
            await api.reply('¡pong!');
        }
    }
}`
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Gestor de Plugins</h1>
                    <p className="text-gray-500">Expande las capacidades de BotMaRe usando JavaScript.</p>
                </div>
                <button onClick={openNewModal} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
                    ➕ Nuevo Plugin
                </button>
            </div>

            {loading ? (
                <div>Cargando plugins...</div>
            ) : plugins.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-semibold mb-2">No tienes plugins instalados</h3>
                    <p className="text-gray-500">Crea tu primer script usando el botón superior.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plugins.map((plugin) => (
                        <div key={plugin.id} className={`border rounded-lg shadow-sm bg-white overflow-hidden ${!plugin.active ? 'opacity-60' : ''}`}>
                            <div className="p-4 flex flex-row items-center justify-between border-b">
                                <h3 className="text-lg font-bold">{plugin.name}</h3>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => handleToggle(plugin.id, plugin.active)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${plugin.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}
                                    >
                                        {plugin.active ? 'Activo' : 'Inactivo'}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden text-ellipsis">
                                    {plugin.description}
                                </p>
                                {plugin.error && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2 border border-red-200">
                                        ⚠️ Error: {plugin.error}
                                    </div>
                                )}
                                <div className="flex justify-between mt-4">
                                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50" onClick={() => {
                                        setEditingPlugin(plugin);
                                        setIsModalOpen(true);
                                    }}>
                                        ✏️ Editar
                                    </button>
                                    <button className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50" onClick={() => handleDelete(plugin.id)}>
                                        🗑️ Borrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && editingPlugin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold">{editingPlugin.id ? 'Editar Plugin' : 'Nuevo Plugin'}</h2>
                        </div>
                        <div className="p-6 flex-1 overflow-auto">
                            <form id="plugin-form" onSubmit={handleSave} className="space-y-4 h-full flex flex-col">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID del Archivo (sin .js)</label>
                                    <input 
                                        disabled={!!plugins.find(p => p.id === editingPlugin.id)}
                                        value={editingPlugin.id} 
                                        onChange={e => setEditingPlugin({...editingPlugin, id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})}
                                        placeholder="ejemplo_plugin"
                                        required
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Solo letras, números, guiones y guiones bajos.</p>
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Código JavaScript (Sandbox)</label>
                                    <textarea
                                        className="w-full flex-1 p-4 font-mono text-sm border rounded-md bg-gray-900 text-green-400 mt-2 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        value={editingPlugin.code}
                                        onChange={e => setEditingPlugin({...editingPlugin, code: e.target.value})}
                                        required
                                        spellCheck="false"
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t flex justify-end space-x-4 bg-gray-50">
                            <button type="button" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 font-medium" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" form="plugin-form" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium">
                                💾 Guardar y Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
