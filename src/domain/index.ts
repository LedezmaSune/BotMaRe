/**
 * DOMAIN LAYER - BOTMARE v2.7.0
 * Única fuente de verdad de tipos de dominio y entidades del sistema.
 * 
 * ESTÁNDAR DE FECHAS:
 * - Persistencia y transporte (API/UI/JSON): ISO 8601 strings o timestamps numéricos en ms.
 * - Lógica de dominio y agendamiento: Instancias temporales Date o Luxon DateTime.
 */

export * from './reminder.types';
export * from './crm.types';
