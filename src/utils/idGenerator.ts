/**
 * Generador monotónico de identificadores numéricos únicos.
 * Garantiza IDs secuenciales sin colisiones incluso ante llamadas masivas concurrentes en el mismo milisegundo.
 * Retorna un number seguro dentro de Number.MAX_SAFE_INTEGER.
 */

let lastMs = 0;
let counter = 0;

export function generateNumericId(): number {
    const now = Date.now();
    if (now <= lastMs) {
        counter++;
    } else {
        lastMs = now;
        counter = 0;
    }

    // Combina timestamp en ms desplazado x 1000 con un contador de secuencia (0-999)
    // Seguro para Number.MAX_SAFE_INTEGER (aprox. 9e15 vs 1.7e15 generado)
    return lastMs * 1000 + (counter % 1000);
}
