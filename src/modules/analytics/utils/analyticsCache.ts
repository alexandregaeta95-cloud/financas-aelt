interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AnalyticsCacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttlMs = 5 * 60 * 1000; // 5 minutos default

  public get<T>(key: string): { data: T; hit: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttlMs;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return { data: entry.data as T, hit: true };
  }

  public set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const analyticsCache = new AnalyticsCacheManager();
