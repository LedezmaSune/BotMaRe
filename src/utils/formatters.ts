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
