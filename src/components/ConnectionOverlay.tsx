'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Loader2, ShieldCheck, QrCode, Hash } from 'lucide-react';
import { siteConfig } from '../config';

interface ConnectionOverlayProps {
    qr: string | null;
    pairingCode?: string | null;
    onRequestPairingCode?: (phone: string) => Promise<string | null>;
    status: string;
}

export function ConnectionOverlay({ qr, pairingCode, onRequestPairingCode, status }: ConnectionOverlayProps) {
    const [mode, setMode] = useState<'qr' | 'code'>('qr');
    const [phone, setPhone] = useState('');
    const [isLoadingCode, setIsLoadingCode] = useState(false);

    if (status === 'connected') return null;

    const handleGetCode = async () => {
        if (!phone || phone.length < 10) {
            alert('Por favor ingresa un número de teléfono válido con código de país (ej. 5211234567890)');
            return;
        }
        if (onRequestPairingCode) {
            setIsLoadingCode(true);
            await onRequestPairingCode(phone);
            setIsLoadingCode(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-700">
            {/* Ambient Background for Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--app-accent)]/20 rounded-full blur-[140px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }}></div>
            
            <div className="relative w-full max-w-lg premium-glass rounded-[40px] p-8 lg:p-12 text-center overflow-hidden flex flex-col items-center">
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--app-accent)] to-transparent opacity-60"></div>
                
                <div className="mb-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[var(--app-accent)] to-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-[0_10px_30px_var(--app-glow)] mb-6 group glow-border">
                        <Smartphone size={40} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white mb-2">Vincular Dispositivo</h2>
                    <p className="text-slate-400 text-sm font-medium">{siteConfig.connectionText}</p>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-full mb-8 border border-white/5 w-fit">
                    <button 
                        onClick={() => setMode('qr')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'qr' ? 'bg-[var(--app-accent)] text-white shadow-[0_4px_15px_var(--app-glow)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <QrCode size={16} /> QR
                    </button>
                    <button 
                        onClick={() => setMode('code')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'code' ? 'bg-[var(--app-accent)] text-white shadow-[0_4px_15px_var(--app-glow)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Hash size={16} /> Código
                    </button>
                </div>

                <div className="relative inline-block group mb-8">
                    {/* Corner Borders */}
                    <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-cyan-500 rounded-tl-xl transition-all group-hover:-translate-x-1 group-hover:-translate-y-1"></div>
                    <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-cyan-500 rounded-tr-xl transition-all group-hover:translate-x-1 group-hover:-translate-y-1"></div>
                    <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-cyan-500 rounded-bl-xl transition-all group-hover:-translate-x-1 group-hover:translate-y-1"></div>
                    <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-cyan-500 rounded-br-xl transition-all group-hover:translate-x-1 group-hover:translate-y-1"></div>

                    <div className="bg-white p-6 rounded-3xl shadow-2xl relative z-10 w-[268px] min-h-[268px] flex flex-col items-center justify-center">
                        {mode === 'qr' ? (
                            qr ? (
                                <QRCodeSVG 
                                    value={qr} 
                                    size={220} 
                                    level="H"
                                    includeMargin={false}
                                    imageSettings={{
                                        src: "/logo.png", // Por si quieres poner un logo luego
                                        x: undefined,
                                        y: undefined,
                                        height: 40,
                                        width: 40,
                                        excavate: true,
                                    }}
                                />
                            ) : (
                                <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <Loader2 size={48} className="animate-spin text-cyan-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center">Generando acceso...</span>
                                    
                                    <button 
                                        onClick={async () => {
                                            if (confirm('Deseas reiniciar la sesión de WhatsApp? Esto borrará los datos de conexión actuales.')) {
                                                const res = await fetch('/api/system/reset-whatsapp', { method: 'POST' });
                                                if (res.ok) alert('Reinicio iniciado. Por favor espera unos segundos.');
                                            }
                                        }}
                                        className="mt-2 text-[8px] text-slate-500 hover:text-cyan-500 underline underline-offset-4 uppercase tracking-widest transition-colors font-bold text-center"
                                    >
                                        ¿No aparece el código? Reiniciar
                                    </button>
                                </div>
                            )
                        ) : (
                            // Modo Código
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                {pairingCode ? (
                                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tu Código:</span>
                                        <div className="text-4xl font-black tracking-[0.2em] text-slate-800 bg-slate-100 py-4 px-6 rounded-2xl border border-slate-200 shadow-inner">
                                            {pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 w-full animate-in fade-in duration-300">
                                        <label className="text-xs font-bold text-slate-500 text-left">Número de WhatsApp</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: 521XXXXXXXXXX"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                        />
                                        <p className="text-[9px] text-slate-400 text-left leading-tight">
                                            Incluye el código de país sin el símbolo '+'. Ej. para México usa 521 seguido de los 10 dígitos.
                                        </p>
                                        <button 
                                            onClick={handleGetCode}
                                            disabled={isLoadingCode || !phone}
                                            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                                        >
                                            {isLoadingCode ? <Loader2 size={16} className="animate-spin" /> : <Hash size={16} />}
                                            Obtener Código
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6 w-full">
                    {mode === 'qr' ? (
                        <div className="flex items-center justify-center gap-8 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/5">1</div>
                                <span className="text-[10px] uppercase font-bold tracking-tighter">Abre WA</span>
                            </div>
                            <div className="w-12 h-px bg-slate-800"></div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/5">2</div>
                                <span className="text-[10px] uppercase font-bold tracking-tighter">Vincular</span>
                            </div>
                            <div className="w-12 h-px bg-slate-800"></div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/5">3</div>
                                <span className="text-[10px] uppercase font-bold tracking-tighter">Escanea</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-8 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/5">1</div>
                                <span className="text-[10px] uppercase font-bold tracking-tighter">Pide Código</span>
                            </div>
                            <div className="w-12 h-px bg-slate-800"></div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/5">2</div>
                                <span className="text-[10px] uppercase font-bold tracking-tighter">Abre WA</span>
                            </div>
                            <div className="w-12 h-px bg-slate-800"></div>
                            <div className="flex flex-col items-center gap-2 text-center w-16">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-white/5">3</div>
                                <span className="text-[10px] uppercase font-bold tracking-tighter leading-tight">Vincular c/ Número</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 py-2 px-4 rounded-full border border-emerald-500/20 w-fit mx-auto mt-4">
                        <ShieldCheck size={14} />
                        Cifrado de Punto a Punto activo
                    </div>
                </div>
            </div>
        </div>
    );
}
