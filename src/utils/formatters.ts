export function formatWhatsAppJid(jid: string): string {
    if (!jid) return '';
    const clean = jid.trim();
    
    // Si ya tiene el sufijo @, lo dejamos como está
    if (clean.includes('@')) return clean;

    // Si contiene un guion, empieza con '1203' o es un número puro de 18 dígitos, es un ID de grupo
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean.includes('-') || digitsOnly.startsWith('1203') || digitsOnly.length === 18) {
        return `${clean}@g.us`;
    }

    // Si es solo números, lo tratamos como chat individual
    let numbers = digitsOnly;
    if (numbers.length === 10) {
        numbers = `521${numbers}`;
    }
    return `${numbers}@s.whatsapp.net`;
}

/**
 * Normaliza y formatea números de teléfono para el envío de SMS internacionales (E.164).
 * Soporta números de cualquier país (EE.UU. +1, España +34, Argentina +549, Colombia +57, Chile +56, Perú +51, etc.),
 * números locales de México (10 dígitos), números importados de WhatsApp (con o sin @s.whatsapp.net o prefijo 521),
 * y números con prefijos internacionales como 00 o 011.
 */
export function formatSmsNumber(target: string): string {
    if (!target) return '';

    // 1. Quitar sufijos de protocolo o dominio de mensajería (@s.whatsapp.net, @lid, @c.us, etc.)
    let clean = target.replace(/@.+/, '').trim();

    // 2. Manejar prefijos internacionales de marcado (00 o 011)
    if (clean.startsWith('00')) {
        clean = '+' + clean.slice(2);
    } else if (clean.startsWith('011')) {
        clean = '+' + clean.slice(3);
    }

    const hasPlus = clean.startsWith('+');
    const digitsOnly = clean.replace(/\D/g, '');

    if (!digitsOnly) return '';

    // 3. Caso especial México local (10 dígitos exactos sin prefijo internacional) -> asumimos +52
    if (digitsOnly.length === 10 && !hasPlus) {
        return `+52${digitsOnly}`;
    }

    // 4. Caso especial México con prefijo móvil WhatsApp (13 dígitos: 52 1 XXXXXXXXXX) -> normalizar a +52XXXXXXXXXX (E.164 estándar SMS)
    if (digitsOnly.length === 13 && digitsOnly.startsWith('521')) {
        return `+52${digitsOnly.slice(3)}`;
    }

    // 5. Todos los demás números internacionales (con o sin '+') -> asegurar formato E.164 (+...)
    return `+${digitsOnly}`;
}

