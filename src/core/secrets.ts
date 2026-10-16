import crypto from 'crypto';

/**
 * Obtiene una variable de entorno obligatoria.
 * Lanza un error si la variable no está definida o está vacía.
 */
export function getRequiredSecret(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`Secreto requerido no configurado: ${name}`);
    }
    return value.trim();
}

/**
 * Genera un secreto criptográficamente seguro codificado en base64url.
 */
export function generateSecret(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
}
