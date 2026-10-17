import { listAutoresponders, getUserState, setUserState } from '../../core/db';

// Normaliza texto: minúsculas y sin acentos/tildes
function normalizeDiacritics(str: string): string {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function stripPunctuation(str: string): string {
    return str.replace(/^[¿¡!?,.:;_\-\s]+|[¿¡!?,.:;_\-\s]+$/g, '');
}

export class AutoresponderService {
    async match(text: string, jid: string): Promise<any | null> {
        const rules = await listAutoresponders() as any[];
        const cleanText = text.toLowerCase().trim();
        const strippedText = stripPunctuation(cleanText);
        const normText = normalizeDiacritics(cleanText);
        const strippedNormText = stripPunctuation(normText);

        const currentStateId = await getUserState(jid);

        let matchedRule = null;

        const checkRuleMatch = (rule: any): boolean => {
            const isRuleActive = rule.isActive === true || rule.isActive === 1 || rule.isActive === '1' || rule.isActive === 'true';
            if (!isRuleActive) return false;

            const rawKeywords = (rule.keyword || '').split(',').map((k: string) => k.trim()).filter(Boolean);

            for (const rawK of rawKeywords) {
                const kClean = rawK.toLowerCase().trim();
                const kStripped = stripPunctuation(kClean);
                const kNorm = normalizeDiacritics(kClean);
                const kNormStripped = stripPunctuation(kNorm);

                if (rule.matchType === 'exact') {
                    if (
                        cleanText === kClean || 
                        strippedText === kStripped || 
                        normText === kNorm || 
                        strippedNormText === kNormStripped
                    ) {
                        return true;
                    }
                } else {
                    // matchType === 'contains'
                    if (
                        cleanText.includes(kClean) || 
                        (kStripped && strippedText.includes(kStripped)) ||
                        normText.includes(kNorm) ||
                        (kNormStripped && strippedNormText.includes(kNormStripped))
                    ) {
                        return true;
                    }
                }
            }
            return false;
        };

        // 1. Intentar coincidir reglas hijas si está dentro de un submenú
        if (currentStateId) {
            for (const rule of rules) {
                if (rule.parentId !== currentStateId) continue;
                if (checkRuleMatch(rule)) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        // 2. Fallback a menús globales principales
        if (!matchedRule) {
            for (const rule of rules) {
                if (rule.parentId != null) continue;
                if (checkRuleMatch(rule)) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        // 3. Transiciones de estado de menú
        if (matchedRule) {
            const hasChildren = rules.some(r => r.parentId === matchedRule.id);
            if (hasChildren) {
                await setUserState(jid, matchedRule.id);
            } else {
                await setUserState(jid, null);
            }
        }

        return matchedRule;
    }
}

