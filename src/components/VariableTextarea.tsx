'use client';

import React, { useState, useRef, useEffect } from 'react';

const VARIABLES = [
    { tag: '{NOMBRE}', desc: 'Nombre completo' },
    { tag: '{FIRST_NAME}', desc: 'Primer nombre' },
    { tag: '{NOMBRE_PILA}', desc: 'Primer nombre' },
    { tag: '{APELLIDO}', desc: 'Apellidos' },
    { tag: '{LAST_NAME}', desc: 'Apellidos' },
    { tag: '{HORA_12}', desc: 'Hora (12h)' },
    { tag: '{HORA_24}', desc: 'Hora (24h)' },
    { tag: '{DIA_SEMANA}', desc: 'Día de la semana' },
    { tag: '{DAY_OF_WEEK}', desc: 'Día de la semana' },
    { tag: '{DIA_MES}', desc: 'Día del mes' },
    { tag: '{MES}', desc: 'Mes actual' },
    { tag: '{MONTH}', desc: 'Mes actual' },
    { tag: '{ANO}', desc: 'Año actual' },
    { tag: '{YEAR}', desc: 'Año actual' },
    { tag: '{FECHA}', desc: 'Fecha actual' },
    { tag: '{DATE}', desc: 'Fecha actual' },
    { tag: '{NUMERO_ALEATORIO}', desc: 'Número aleatorio' }
];

const MEDIA_TAGS = [
    { tag: '[IMG: ]', desc: 'Insertar Imagen (URL o texto)' },
    { tag: '[DOC: ]', desc: 'Insertar Documento (PDF/Word/etc)' },
    { tag: '[VIDEO: ]', desc: 'Insertar Video (MP4)' },
    { tag: '[AUDIO: ]', desc: 'Insertar Audio (MP3/OGG)' }
];

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    rows?: number;
}

export function VariableTextarea({ value, onChange, placeholder, required, className, rows = 3 }: Props) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filter, setFilter] = useState('');
    const [cursorIndex, setCursorIndex] = useState(-1);
    const [triggerChar, setTriggerChar] = useState<'{' | '[' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const checkSuggestions = (target: HTMLTextAreaElement) => {
        const val = target.value;
        const caretPos = target.selectionStart;
        const textBeforeCaret = val.substring(0, caretPos);
        
        const lastBraceIndex = textBeforeCaret.lastIndexOf('{');
        const lastBracketIndex = textBeforeCaret.lastIndexOf('[');

        // Determinamos qué disparador está más cerca del cursor
        if (lastBraceIndex !== -1 && lastBraceIndex > lastBracketIndex) {
            const possibleTag = textBeforeCaret.substring(lastBraceIndex);
            if (!possibleTag.includes(' ') && !possibleTag.includes('}')) {
                setFilter(possibleTag.substring(1).toUpperCase());
                setCursorIndex(lastBraceIndex);
                setTriggerChar('{');
                setShowSuggestions(true);
                return;
            }
        } else if (lastBracketIndex !== -1 && lastBracketIndex > lastBraceIndex) {
            const possibleTag = textBeforeCaret.substring(lastBracketIndex);
            if (!possibleTag.includes(' ') && !possibleTag.includes(']')) {
                setFilter(possibleTag.substring(1).toUpperCase());
                setCursorIndex(lastBracketIndex);
                setTriggerChar('[');
                setShowSuggestions(true);
                return;
            }
        }
        setShowSuggestions(false);
        setTriggerChar(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        checkSuggestions(e.target);
    };

    const handleSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        checkSuggestions(e.target as HTMLTextAreaElement);
    };

    const insertVariable = (tag: string) => {
        if (cursorIndex !== -1) {
            const before = value.substring(0, cursorIndex);
            const afterCaret = textareaRef.current?.selectionStart || value.length;
            const after = value.substring(afterCaret);
            
            const newValue = before + tag + after;
            onChange(newValue);
            setShowSuggestions(false);
            
            // Re-enfocar y posicionar el cursor de forma inteligente
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    let newPos = cursorIndex + tag.length;
                    if (triggerChar === '[') {
                        // Posicionar el cursor justo después de los dos puntos y espacio (ej: [IMG: |])
                        const colonIdx = tag.indexOf(':');
                        if (colonIdx !== -1) {
                            newPos = cursorIndex + colonIdx + 2;
                        }
                    }
                    textareaRef.current.setSelectionRange(newPos, newPos);
                }
            }, 0);
        }
    };

    const suggestions = triggerChar === '{'
        ? VARIABLES.filter(v => v.tag.toUpperCase().includes(filter))
        : MEDIA_TAGS.filter(v => v.tag.toUpperCase().includes(filter));

    // Cerrar al hacer clic fuera del popup
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onClick={handleSelection}
                onKeyUp={handleSelection}
                className={className}
                placeholder={placeholder}
                required={required}
                rows={rows}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    ref={popupRef}
                    className="absolute z-[100] mt-1 max-h-48 w-full overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-indigo-500/30 dark:border-indigo-500/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    {suggestions.map((v, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => insertVariable(v.tag)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between items-center"
                        >
                            <span className="font-mono text-cyan-400 font-bold">{v.tag}</span>
                            <span className="text-[10px] text-app-text-muted uppercase tracking-wider">{v.desc}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
