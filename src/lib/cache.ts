type CacheEntry<T> = {
  data: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>()

  /**
   * Get a cached value or compute and store it if expired / missing.
   * @param key Unique cache key
   * @param ttlSeconds Time-to-live in seconds (default: 30s)
   * @param fetcher Async function to fetch data on cache miss
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const existing = this.store.get(key)
    const now = Date.now()

    if (existing && existing.expiresAt > now) {
      return existing.data as T
    }

    const freshData = await fetcher()
    this.store.set(key, {
      data: freshData,
      expiresAt: now + ttlSeconds * 1000,
    })

    return freshData
  }

  /**
   * Invalidate a single key or all keys matching a prefix.
   */
  invalidate(keyOrPrefix: string) {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear() {
    this.store.clear()
  }
}

// Global singleton instance
export const cache = new MemoryCache()
