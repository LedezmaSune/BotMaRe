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
                const keyword = rule.keyword.toLowerCase().trim();
                if ((rule.matchType === 'exact' && cleanText === keyword) || 
                    (rule.matchType === 'contains' && cleanText.includes(keyword))) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        // 2. Fallback to global menus
        if (!matchedRule) {
            for (const rule of rules) {
                if (!rule.isActive || rule.parentId != null) continue;
                const keyword = rule.keyword.toLowerCase().trim();
                if ((rule.matchType === 'exact' && cleanText === keyword) || 
                    (rule.matchType === 'contains' && cleanText.includes(keyword))) {
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
