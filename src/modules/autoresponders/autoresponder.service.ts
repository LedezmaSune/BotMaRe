import { listAutoresponders, getUserState, setUserState } from '../../core/memory';

export class AutoresponderService {
    async match(text: string, jid: string): Promise<any | null> {
        const rules = await listAutoresponders() as any[];
        const cleanText = text.toLowerCase().trim();
        const currentStateId = await getUserState(jid);

        let matchedRule = null;

        // 1. Try to match children if in a menu state
        if (currentStateId) {
            for (const rule of rules) {
                if (!rule.isActive || rule.parentId !== currentStateId) continue;
                const keywords = rule.keyword.toLowerCase().split(',').map((k: string) => k.trim());
                let isMatch = false;
                for (const k of keywords) {
                    if ((rule.matchType === 'exact' && cleanText === k) || 
                        (rule.matchType === 'contains' && cleanText.includes(k))) {
                        isMatch = true;
                        break;
                    }
                }
                if (isMatch) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        // 2. Fallback to global menus
        if (!matchedRule) {
            for (const rule of rules) {
                if (!rule.isActive || rule.parentId != null) continue;
                const keywords = rule.keyword.toLowerCase().split(',').map((k: string) => k.trim());
                let isMatch = false;
                for (const k of keywords) {
                    if ((rule.matchType === 'exact' && cleanText === k) || 
                        (rule.matchType === 'contains' && cleanText.includes(k))) {
                        isMatch = true;
                        break;
                    }
                }
                if (isMatch) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        // 3. State transitions
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
