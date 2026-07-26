import { describe, it, expect } from 'vitest';
import { processVariables } from '@/utils/variables';

describe('processVariables', () => {
    it('debe reemplazar {NOMBRE} por el nombre del contacto', () => {
        const text = 'Hola {NOMBRE}, ¿cómo estás?';
        const result = processVariables(text, 'Juan Perez');
        expect(result).toBe('Hola Juan Perez, ¿cómo estás?');
    });

    it('debe usar "Usuario" si no se proporciona nombre', () => {
        const text = 'Hola {NOMBRE}';
        const result = processVariables(text, '');
        expect(result).toBe('Hola Usuario');
    });

    it('debe resolver spintax simple', () => {
        const text = '{Hola|Saludos} {NOMBRE}';
        const result = processVariables(text, 'Ana');
        // El resultado debe empezar con "Hola Ana" o "Saludos Ana"
        expect(['Hola Ana', 'Saludos Ana']).toContain(result);
    });

    it('debe extraer el {FIRST_NAME}', () => {
        const text = 'Adiós {FIRST_NAME}';
        const result = processVariables(text, 'Juan Perez');
        expect(result).toBe('Adiós Juan');
    });
});
