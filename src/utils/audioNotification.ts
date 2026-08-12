/**
 * Generador de sonido sintético ultra ligero para notificaciones
 * usando Web Audio API nativo (sin dependencias ni archivos externos).
 */
export function playNotificationSound(type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    if (typeof window === 'undefined') return;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        // Frecuencias para crear un chime elegante estilo Apple/Telegram
        const frequencies = {
            info: [587.33, 880.00], // Re5 -> La5
            success: [523.25, 659.25, 783.99], // Do5 -> Mi5 -> Sol5
            warning: [659.25, 587.33], // Mi5 -> Re5
            error: [440.00, 311.13] // La4 -> Re#4
        }[type] || [587.33, 880.00];

        frequencies.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * 0.08);

            // Envolvente suave para evitar clicks
            gain.gain.setValueAtTime(0.001, now + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.15, now + index * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + index * 0.08);
            osc.stop(now + index * 0.08 + 0.3);
        });

        // Limpiar contexto después de reproducir
        setTimeout(() => {
            if (ctx.state !== 'closed') {
                ctx.close().catch(() => null);
            }
        }, 1000);
    } catch (e) {
        // Silenciar si el navegador bloquea audio antes de interacción de usuario
    }
}
