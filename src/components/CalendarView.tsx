'use client';

import React, { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Reminder } from '../types';

function getISOWeekNumber(d: Date) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

interface CalendarViewProps {
    reminders: Reminder[];
    onDateSelect?: (date: string) => void;
    onEventSelect?: (id: number) => void;
}

export function CalendarView({ reminders, onDateSelect, onEventSelect }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => {
        const rawDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return (rawDay + 6) % 7; // Lunes = 0, Domingo = 6
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const nextPeriod = () => {
        const next = new Date(currentDate);
        if (currentView === 'month') {
            next.setMonth(currentDate.getMonth() + 1);
        } else if (currentView === 'week') {
            next.setDate(currentDate.getDate() + 7);
        } else if (currentView === 'day') {
            next.setDate(currentDate.getDate() + 1);
        } else if (currentView === 'year') {
            next.setFullYear(currentDate.getFullYear() + 1);
        }
        setCurrentDate(next);
    };

    const prevPeriod = () => {
        const prev = new Date(currentDate);
        if (currentView === 'month') {
            prev.setMonth(currentDate.getMonth() - 1);
        } else if (currentView === 'week') {
            prev.setDate(currentDate.getDate() - 7);
        } else if (currentView === 'day') {
            prev.setDate(currentDate.getDate() - 1);
        } else if (currentView === 'year') {
            prev.setFullYear(currentDate.getFullYear() - 1);
        }
        setCurrentDate(prev);
    };

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const getDaysArray = (date: Date = currentDate) => {
        const daysArray = [];
        const dInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const fDay = (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7;
        const prevMonthDays = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
        
        for (let i = fDay - 1; i >= 0; i--) {
            daysArray.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(date.getFullYear(), date.getMonth() - 1, prevMonthDays - i)
            });
        }
        
        for (let i = 1; i <= dInMonth; i++) {
            daysArray.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(date.getFullYear(), date.getMonth(), i)
            });
        }
        
        const remainingCells = 42 - daysArray.length;
        for (let i = 1; i <= remainingCells; i++) {
            daysArray.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(date.getFullYear(), date.getMonth() + 1, i)
            });
        }
        
        return daysArray;
    };

    const days = getDaysArray(currentDate);

    const getRemindersForDay = (date: Date) => {
        return reminders.filter(r => {
            if (!r.time) return false;
            const reminderDate = new Date(r.time);
            return reminderDate.getDate() === date.getDate() &&
                   reminderDate.getMonth() === date.getMonth() &&
                   reminderDate.getFullYear() === date.getFullYear();
        });
    };

    const renderAgendaView = () => {
        const sorted = [...reminders]
            .filter(r => r.time)
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        const grouped: Record<string, { date: Date, events: typeof reminders }> = {};
        sorted.forEach(r => {
            const d = new Date(r.time);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!grouped[key]) {
                grouped[key] = { date: d, events: [] };
            }
            grouped[key].events.push(r);
        });

        const todayStr = `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;

        if (Object.keys(grouped).length === 0) {
            return (
                <div className="border border-app-border rounded-2xl overflow-hidden relative z-10 bg-app-bg dark:bg-background/50 shadow-inner p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <CalendarDays className="text-app-text-muted w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-app-text mb-2">No hay eventos</h3>
                    <p className="text-app-text-muted max-w-md">
                        Aún no tienes mensajes programados.
                    </p>
                </div>
            );
        }

        return (
            <div className="border border-app-border rounded-2xl overflow-hidden relative z-10 bg-app-bg dark:bg-background/50 shadow-inner">
                <div className="flex flex-col">
                    {Object.values(grouped).map(({ date, events }, i) => {
                        const isToday = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === todayStr;
                        const dayNum = date.getDate();
                        const monthName = monthNames[date.getMonth()].substring(0, 3).toUpperCase();
                        const dayName = dayNames[(date.getDay() + 6) % 7].toUpperCase();

                        return (
                            <div key={i} className="flex flex-col md:flex-row border-b border-app-border last:border-b-0 group transition-colors">
                                {/* Left Side: Date Info */}
                                <div className="w-full md:w-44 shrink-0 p-4 md:p-6 flex items-center gap-4 border-b md:border-b-0 md:border-r border-app-border/30 bg-slate-50/20 dark:bg-slate-900/10">
                                    <div className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-xl font-black ${isToday ? 'bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-xl shadow-cyan-500/30' : 'text-app-text border-2 border-app-border/40'}`}>
                                        {dayNum}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] md:text-[11px] font-black text-app-text-muted tracking-[0.2em]">{monthName}, {dayName}</span>
                                    </div>
                                </div>
                                
                                {/* Right Side: Events List */}
                                <div className="flex-1 flex flex-col relative py-2">
                                    {isToday && (
                                        <div className="absolute left-0 right-0 top-12 z-20 pointer-events-none px-4">
                                            <div className="flex items-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 -ml-1.25 shadow-lg shadow-cyan-500/50"></div>
                                                <div className="flex-1 border-t-2 border-cyan-500/70"></div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {events.map((r) => {
                                        const dateObj = new Date(r.time);
                                        const isMidnight = dateObj.getHours() === 0 && dateObj.getMinutes() === 0;
                                        
                                        return (
                                            <div 
                                                key={r.id} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEventSelect) {
                                                        onEventSelect(r.id);
                                                    } else if (onDateSelect) {
                                                        const tzoffset = dateObj.getTimezoneOffset() * 60000;
                                                        const localISOTime = new Date(dateObj.getTime() - tzoffset).toISOString().slice(0, 16);
                                                        onDateSelect(localISOTime);
                                                    }
                                                }}
                                                className="flex items-center gap-4 px-4 md:px-8 py-3 cursor-pointer hover:bg-cyan-500/5 transition-all group/item"
                                            >
                                                <div className="w-3 h-3 rounded-full bg-cyan-500 group-hover/item:scale-125 transition-transform shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
                                                
                                                <div className="w-28 md:w-32 shrink-0">
                                                    <span className="text-xs md:text-sm font-black text-app-text-muted group-hover/item:text-cyan-500 transition-colors">
                                                        {isMidnight ? 'Todo el día' : dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm md:text-base font-black text-app-text uppercase tracking-tight truncate block group-hover/item:translate-x-1 transition-transform">
                                                        {r.title || r.text}
                                                    </span>
                                                </div>

                                                <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                                    r.status === 'sent' ? 'bg-emerald-500/20 text-emerald-500' :
                                                    r.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                                                    'bg-cyan-500/20 text-cyan-500'
                                                }`}>
                                                    {r.status || 'pending'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getDaysOfWeek = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
        start.setDate(diff);
        
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    };

    const renderTimeGrid = (targetDates: Date[]) => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const nowPosition = (currentHour * 64) + ((currentMinute / 60) * 64);

        const gridLayout = "grid grid-cols-[64px_1fr] md:grid-cols-[80px_1fr]";

        return (
                <div className="flex-1 overflow-y-auto max-h-[700px] custom-scrollbar relative bg-app-bg dark:bg-background/20 rounded-2xl border border-app-border">
                    {/* 1. Sticky Header Grid */}
                    <div className={`sticky top-0 z-40 ${gridLayout} border-b border-app-border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md`}>
                        <div className="border-r border-app-border flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 py-4">
                            <span className="text-[9px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-tighter">GMT-06</span>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${targetDates.length}, 1fr)` }}>
                            {targetDates.map((d, i) => {
                                const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                const dayName = dayNames[(d.getDay() + 6) % 7].toUpperCase();
                                const dayReminders = getRemindersForDay(d);
                                const allDayEvents = dayReminders.filter(r => {
                                    const rd = new Date(r.time!);
                                    return rd.getHours() === 0 && rd.getMinutes() === 0;
                                });

                                return (
                                    <div key={i} className={`py-2 flex flex-col items-center justify-center border-l first:border-l-0 border-app-border/20`}>
                                        <span className={`text-[10px] md:text-[11px] font-black tracking-[0.2em] mb-1 ${isToday ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-app-text-muted opacity-60'}`}>{dayName}</span>
                                        <div className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full text-base md:text-xl font-black transition-all ${isToday ? 'bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-xl shadow-cyan-500/30' : 'text-slate-700 dark:text-app-text hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                            {d.getDate()}
                                        </div>
                                        {allDayEvents.length > 0 && (
                                            <div className="w-full mt-2 px-1 space-y-1">
                                                {allDayEvents.map(r => (
                                                    <div key={r.id} className="bg-purple-600/90 border border-purple-400/50 rounded px-1.5 py-0.5 truncate text-[8px] md:text-[10px] font-black text-white shadow-sm">
                                                        {r.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative min-h-[1536px]">
                        {/* 2. Background Grid (Full width) */}
                        <div className="absolute inset-0 pointer-events-none">
                            {hours.map(h => (
                                <div key={h} className="h-16 border-b border-app-border/20"></div>
                            ))}
                        </div>

                        {/* 3. Content Grid (Matching Header) */}
                        <div className={`relative h-full ${gridLayout}`}>
                            {/* Time labels column */}
                            <div className="border-r border-app-border bg-slate-50/20 dark:bg-slate-900/20 relative z-10 h-full">
                                {hours.map(h => (
                                    <div key={h} className="h-16 flex items-center justify-center border-b border-app-border/5">
                                        <span className="text-xs md:text-sm font-black text-cyan-600 dark:text-cyan-500/80">
                                            {h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Day columns overlay */}
                            <div className="grid relative z-10" style={{ gridTemplateColumns: `repeat(${targetDates.length}, 1fr)` }}>
                                {targetDates.map((d, dateIdx) => {
                                    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                    const dayReminders = getRemindersForDay(d).filter(r => {
                                        const rd = new Date(r.time!);
                                        return !(rd.getHours() === 0 && rd.getMinutes() === 0);
                                    });

                                    return (
                                        <div key={dateIdx} className="relative h-full border-r border-app-border/10 last:border-r-0">
                                            {isToday && (
                                                <div 
                                                    className="absolute left-0 right-0 flex items-center z-30 pointer-events-none"
                                                    style={{ top: `${nowPosition}px`, transform: 'translateY(-50%)' }}
                                                >
                                                    <div className="w-3 h-3 rounded-full bg-cyan-500 -ml-1.5 shadow-lg shadow-cyan-500/50 border-2 border-white dark:border-slate-900"></div>
                                                    <div className="flex-1 border-t-2 border-cyan-500 shadow-sm"></div>
                                                </div>
                                            )}

                                            {dayReminders.map(r => {
                                                const rd = new Date(r.time!);
                                                const top = (rd.getHours() * 64) + ((rd.getMinutes() / 60) * 64);
                                                return (
                                                    <div 
                                                        key={r.id} 
                                                        style={{ top: `${top}px`, height: '58px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onEventSelect) {
                                                                onEventSelect(r.id);
                                                            } else if (onDateSelect) {
                                                                onDateSelect(new Date(rd.getTime() - rd.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                                                            }
                                                        }}
                                                        className="absolute left-1 right-1 bg-cyan-500/10 border-l-4 border-violet-500 rounded-lg p-2 overflow-hidden cursor-pointer hover:bg-cyan-500/20 transition-all z-10 shadow-lg group backdrop-blur-sm border border-cyan-500/20"
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="text-[10px] font-black text-cyan-600 dark:text-cyan-400">
                                                                {rd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
                                                        </div>
                                                        <div className="text-[11px] md:text-xs font-black text-app-text leading-tight group-hover:whitespace-normal line-clamp-2">
                                                            {r.title || r.text}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
        );
    };

    const renderYearView = () => {
        const year = currentDate.getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => i);

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 p-2">
                {months.map(monthIdx => {
                    const monthDate = new Date(year, monthIdx, 1);
                    const monthDays = getDaysArray(monthDate);

                    return (
                        <div key={monthIdx} className="flex flex-col">
                            <h3 className="text-base font-black text-app-text mb-3 px-2 border-l-4 border-indigo-500">{monthNames[monthIdx]}</h3>
                            <div className="grid grid-cols-[22px_repeat(7,1fr)] gap-y-1">
                                <div className="text-[10px] text-transparent border-b border-app-border/10"></div>
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-black text-app-text-muted opacity-40 pb-1 border-b border-app-border/10">
                                        {d}
                                    </div>
                                ))}
                                {monthDays.map((cell, idx) => {
                                    const isCurrentMonth = cell.date.getMonth() === monthIdx;
                                    const isToday = cell.date.getDate() === new Date().getDate() && 
                                                    cell.date.getMonth() === new Date().getMonth() && 
                                                    cell.date.getFullYear() === new Date().getFullYear();
                                    
                                    const showWeekNum = idx % 7 === 0;
                                    const weekNum = getISOWeekNumber(cell.date);

                                    return (
                                        <Fragment key={idx}>
                                            {showWeekNum && (
                                                <div className="text-[9px] font-black text-app-text-muted opacity-20 flex items-center justify-center">
                                                    {weekNum}
                                                </div>
                                            )}
                                            <div 
                                                onClick={() => {
                                                    setCurrentDate(cell.date);
                                                    setCurrentView('month');
                                                }}
                                                className={`aspect-square flex items-center justify-center text-[10px] md:text-[11px] cursor-pointer hover:bg-indigo-500/10 rounded-full transition-colors relative group ${
                                                    !isCurrentMonth ? 'opacity-20' : 'text-app-text font-bold'
                                                } ${
                                                    isToday ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/40 z-10 scale-110' : ''
                                                }`}
                                            >
                                                {cell.day}
                                                {!isToday && isCurrentMonth && getRemindersForDay(cell.date).length > 0 && (
                                                    <div className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full opacity-40 group-hover:opacity-100"></div>
                                                )}
                                            </div>
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => renderTimeGrid([currentDate]);
    const renderWeekView = () => renderTimeGrid(getDaysOfWeek(currentDate));

    return (
        <section className="bg-app-card border border-app-border rounded-3xl p-6 lg:p-8 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto shadow-2xl relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 relative z-10 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                        <CalendarDays size={24} strokeWidth={2.5} />
                    </div>
                    <div className="hidden md:block">
                        <h2 className="text-xl font-extrabold text-app-text">Calendario</h2>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto flex-1 md:justify-end">
                    <button 
                        onClick={() => setCurrentDate(new Date())} 
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-app-text transition-colors border border-app-border"
                    >
                        Hoy
                    </button>
                    
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-app-border p-1">
                        <button onClick={prevPeriod} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronLeft size={20} className="text-app-text" />
                        </button>
                        <button onClick={nextPeriod} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronRight size={20} className="text-app-text" />
                        </button>
                    </div>

                    <span className="text-lg md:text-xl font-bold text-app-text capitalize min-w-[150px] text-left md:text-center">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    
                    <div className="flex-1 md:hidden"></div>

                    <div className="relative group ml-auto md:ml-4">
                        <select 
                            value={currentView}
                            onChange={(e) => setCurrentView(e.target.value)}
                            className="appearance-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-app-border rounded-xl px-4 py-2 pr-8 text-sm font-bold text-app-text cursor-pointer outline-none transition-colors"
                        >
                            <option value="month">Mes</option>
                            <option value="day">Día</option>
                            <option value="week">Semana</option>
                            <option value="year">Año</option>
                            <option value="agenda">Agenda</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-app-text">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            {currentView === 'month' ? (
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={`month-${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.3 }}
                        className="border border-app-border rounded-2xl overflow-hidden relative z-10 bg-app-bg dark:bg-background/50 shadow-inner"
                    >
                <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] md:grid-cols-[40px_repeat(7,minmax(0,1fr))] border-b border-app-border bg-slate-50 dark:bg-slate-900/50">
                    <div className="border-r border-app-border flex items-center justify-center">
                        <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">SEM</span>
                    </div>
                    {dayNames.map(day => (
                        <div key={day} className="text-center font-bold text-xs md:text-sm uppercase tracking-widest text-slate-700 dark:text-violet-400 py-3 border-r border-app-border last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="flex flex-col">
                    {Array.from({ length: 6 }).map((_, weekIndex) => {
                        const week = days.slice(weekIndex * 7, (weekIndex + 1) * 7);
                        if (week.length === 0) return null;
                        const weekNumber = getISOWeekNumber(week[0].date);
                        
                        return (
                            <div key={weekIndex} className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] md:grid-cols-[40px_repeat(7,minmax(0,1fr))] border-b border-app-border last:border-b-0">
                                <div className="border-r border-app-border flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20">
                                    <span className="text-sm md:text-base font-black text-cyan-700 dark:text-cyan-400 -rotate-90 md:rotate-0 tracking-widest">
                                        S{weekNumber}
                                    </span>
                                </div>
                                {week.map((cell, dayIndex) => {
                                    const dayReminders = getRemindersForDay(cell.date);
                                    const isToday = cell.date.getDate() === new Date().getDate() && 
                                                    cell.date.getMonth() === new Date().getMonth() && 
                                                    cell.date.getFullYear() === new Date().getFullYear();

                                    return (
                                        <div 
                                            key={dayIndex} 
                                            onClick={() => {
                                                if (onDateSelect) {
                                                    const d = new Date(cell.date.getFullYear(), cell.date.getMonth(), cell.day, 12, 0);
                                                    const tzoffset = d.getTimezoneOffset() * 60000;
                                                    const localISOTime = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
                                                    onDateSelect(localISOTime);
                                                }
                                            }}
                                            className={`min-h-[100px] md:min-h-[140px] p-1 border-r border-app-border cursor-pointer hover:bg-indigo-500/5 transition-colors group flex flex-col min-w-0 ${!cell.isCurrentMonth ? 'opacity-40 bg-slate-50/50 dark:bg-slate-900/20' : ''} ${dayIndex === 6 ? 'border-r-0' : ''}`}
                                        >
                                            <div className="flex justify-end mb-1 px-1 shrink-0">
                                                <span className={`text-sm md:text-base font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all mt-1 ${isToday ? 'bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/30' : 'text-slate-600 dark:text-app-text group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
                                                    {cell.day}
                                                </span>
                                            </div>
                                            <div className="space-y-1 overflow-y-auto max-h-[65px] md:max-h-[100px] custom-scrollbar px-1 flex-1 min-w-0">
                                                {dayReminders.map(r => (
                                                    <div 
                                                        key={r.id} 
                                                        className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded border-l-2 flex items-center gap-1 min-w-0 max-w-full ${
                                                            r.status === 'sent' 
                                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400' 
                                                                : r.status === 'failed'
                                                                ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400'
                                                                : 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                                                        }`}
                                                        title={r.text}
                                                    >
                                                        <span className="font-bold opacity-80 shrink-0">{new Date(r.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="truncate min-w-0">{r.title || r.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
                </motion.div>
                </AnimatePresence>
            ) : currentView === 'agenda' ? (
                renderAgendaView()
            ) : currentView === 'day' ? (
                renderDayView()
            ) : currentView === 'week' ? (
                renderWeekView()
            ) : currentView === 'year' ? (
                renderYearView()
            ) : (
                <div className="border border-app-border rounded-2xl overflow-hidden relative z-10 bg-app-bg dark:bg-background/50 shadow-inner p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                        <Clock className="text-indigo-500 w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-app-text mb-2">Vista en desarrollo</h3>
                    <p className="text-app-text-muted max-w-md">
                        La vista de {currentView === 'day' ? 'Día' : currentView === 'week' ? 'Semana' : currentView === 'year' ? 'Año' : 'Agenda'} estará disponible en la próxima actualización. Por ahora, por favor utiliza la vista de <strong>Mes</strong>.
                    </p>
                    <button 
                        onClick={() => setCurrentView('month')}
                        className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30"
                    >
                        Volver a vista de Mes
                    </button>
                </div>
            )}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.3);
                    border-radius: 4px;
                }
            `}</style>
        </section>
    );
}
