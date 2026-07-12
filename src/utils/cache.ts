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
        return item.value;
    }

    /**
     * Set a value in the cache with a Time-To-Live in milliseconds.
     */
    set(key: string, value: any, ttlMs: number): void {
        this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
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
