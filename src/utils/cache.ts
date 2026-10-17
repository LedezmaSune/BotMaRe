/**
 * Simple in-memory cache helper.
 */
class MemoryCache {
    private cache = new Map<string, { value: any, expiresAt: number }>();

    /**
     * Get a value from the cache.
     * Returns null if key does not exist or is expired.
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        if (item.value && typeof item.value === 'object') {
            try {
                return structuredClone(item.value);
            } catch {
                return JSON.parse(JSON.stringify(item.value));
            }
        }
        return item.value;
    }

    /**
     * Set a value in the cache with a Time-To-Live in milliseconds.
     */
    set(key: string, value: any, ttlMs: number): void {
        let cloned = value;
        if (value && typeof value === 'object') {
            try {
                cloned = structuredClone(value);
            } catch {
                cloned = JSON.parse(JSON.stringify(value));
            }
        }
        this.cache.set(key, { value: cloned, expiresAt: Date.now() + ttlMs });
    }

    /**
     * Delete a key from the cache.
     */
    del(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries.
     */
    clear(): void {
        this.cache.clear();
    }
}

export const cacheManager = new MemoryCache();
