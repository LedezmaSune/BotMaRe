'use client';

import { Users, RefreshCw, Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GroupsProps {
    groups: any[];
    allowedGroups: string[];
    onToggle: (jid: string) => void;
    onRefresh: () => void;
}

export function Groups({ groups, allowedGroups, onToggle, onRefresh }: GroupsProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = groups.filter(g => 
        g.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.id.includes(searchTerm)
    );

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // alert('Copiado al portapapeles: ' + text);
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-app-text tracking-tight">Gestión de Grupos</h2>
                        <p className="text-app-text-muted text-xs uppercase tracking-widest font-bold">Activa o desactiva la IA en grupos específicos</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                        <input 
                            type="text"
                            placeholder="Buscar grupo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-app-card border border-app-border rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-2.5 bg-app-card border border-app-border rounded-xl text-app-text-muted hover:text-cyan-500 transition-all active:scale-95 shadow-sm"
                        title="Actualizar grupos"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.05 }
                    }
                }}
            >
                <AnimatePresence mode="popLayout">
                {filteredGroups.map((group) => {
                    const isAllowed = allowedGroups.includes(group.id);
                    
                    return (
                        <motion.div 
                            key={group.id} 
                            layout
                            variants={{
                                hidden: { opacity: 0, scale: 0.95, y: 10 },
                                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                            }}
                            className={`bg-app-card border rounded-2xl p-5 transition-all group relative overflow-hidden flex flex-col justify-between ${isAllowed ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-app-border hover:border-app-border-hover'}`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isAllowed ? 'bg-cyan-500 text-white' : 'bg-app-border text-app-text-muted'}`}>
                                            {isAllowed ? 'IA Activa' : 'IA Inactiva'}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-app-text-muted">{group.participants?.length || 0} Miembros</span>
                                </div>
                                
                                <h3 className="font-bold text-app-text text-sm mb-1 truncate" title={group.subject}>
                                    {group.subject || 'Sin nombre'}
                                </h3>
                                
                                <div className="flex items-center gap-1 group/id">
                                    <p className="text-[10px] font-mono text-app-text-muted truncate flex-1">
                                        {group.id}
                                    </p>
                                    <button 
                                        onClick={() => copyToClipboard(group.id)}
                                        className="opacity-0 group-hover/id:opacity-100 p-1 hover:text-cyan-500 transition-all"
                                        title="Copiar ID"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-app-border/50 flex items-center justify-between">
                                <span className="text-[8px] font-bold text-app-text-muted uppercase">
                                    {group.creation ? `Creado: ${new Date(group.creation * 1000).toLocaleDateString()}` : 'Fecha desconocida'}
                                </span>
                                
                                <button
                                    onClick={() => onToggle(group.id)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isAllowed ? 'bg-cyan-500' : 'bg-app-border'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isAllowed ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
                </AnimatePresence>

                {filteredGroups.length === 0 && (
                    <motion.div 
                        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                        className="col-span-full py-20 text-center bg-app-card/20 rounded-3xl border-2 border-dashed border-app-border"
                    >
                        <Users size={48} className="mx-auto mb-4 text-app-text-muted opacity-20" />
                        <p className="text-app-text-muted font-bold uppercase text-xs tracking-widest">No se encontraron grupos</p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
