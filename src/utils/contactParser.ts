export interface ParsedContact {
    number: string;
    name: string;
}

/**
 * Parses a list of contacts from a multi-line string.
 * Supports "Number, Name", "Name, Number", or "Number Name" (without comma).
 */
export function parseContactList(contactsStr: string): ParsedContact[] {
    if (!contactsStr) return [];

    return contactsStr
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
            // Ignorar líneas vacías o que claramente son encabezados (sin dígitos suficientes)
            const digits = line.replace(/\D/g, '');
            const isJid = line.endsWith('@g.us') || line.endsWith('@s.whatsapp.net') || line.endsWith('@lid');
            return line.length > 0 && (digits.length >= 8 || isJid);
        })
        .map(line => {
            // Case 0: WhatsApp JID (Group or User)
            if (line.endsWith('@g.us') || line.endsWith('@s.whatsapp.net') || line.endsWith('@lid')) {
                return { number: line, name: '' };
            }

            // Case 1: Comma separated
            if (line.includes(',')) {
                const parts = line.split(',');
                const part1 = parts[0].trim();
                const part2 = parts.slice(1).join(',').trim();

                const digits1 = part1.replace(/\D/g, '');
                const digits2 = part2.replace(/\D/g, '');

                // Guess which one is the number
                if (digits1.length >= 8 || part1.endsWith('@s.whatsapp.net') || part1.endsWith('@lid')) {
                    return { number: part1.replace(/[^\d@.uslidwatsphnet]/g, ''), name: part2 };
                } else {
                    return { number: part2.replace(/[^\d@.uslidwatsphnet]/g, ''), name: part1 };
                }
            }

            // Case 2: No comma, look for a number within the string
            const numberMatch = line.match(/\+?\d{8,15}/);
            if (numberMatch) {
                const number = numberMatch[0];
                const name = line.replace(number, '').replace(/^[-\s]+|[-\s]+$/g, '').trim();
                return { number, name };
            }

            // Fallback: Clean numeric only
            return { number: line.replace(/\D/g, ''), name: '' };
        })
        .filter(c => c.number.length >= 8 || c.number.includes('@'));
}
