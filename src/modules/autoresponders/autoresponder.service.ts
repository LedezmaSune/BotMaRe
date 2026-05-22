import { listAutoresponders } from '../../core/memory';

export class AutoresponderService {
    async match(text: string): Promise<any | null> {
        const rules = await listAutoresponders() as any[];
        const cleanText = text.toLowerCase().trim();

        for (const rule of rules) {
            if (!rule.isActive) continue;

            const keyword = rule.keyword.toLowerCase().trim();

            if (rule.matchType === 'exact') {
                if (cleanText === keyword) {
                    return rule;
                }
            } else if (rule.matchType === 'contains') {
                if (cleanText.includes(keyword)) {
                    return rule;
                }
            }
        }

        return null;
    }
}
