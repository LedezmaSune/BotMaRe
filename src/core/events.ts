import { EventEmitter } from 'events';

/**
 * Bus de eventos global para comunicar módulos internos 
 * sin crear dependencias circulares.
 */
export const globalEvents = new EventEmitter();

export const EVENTS = {
    DIFFUSION_PROGRESS: 'diffusion:progress',
    DIFFUSION_COMPLETED: 'diffusion:completed',
    DIFFUSION_LOG: 'diffusion:log',
    SYSTEM_NOTIFY: 'system:notify'
};
