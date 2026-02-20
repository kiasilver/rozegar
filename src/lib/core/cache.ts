/**
 * Cache System - سیستم کش برای بهبود Performance
 */

// In-memory cache (برای production بهتر است از Redis استفاده شود)
const cache = new Map<string, { data: any; expires: number }>();

const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * ذخیره در cache
 */
export function setCache(key: string, data: any, ttl: number = DEFAULT_TTL): void {
  const expires = Date.now() + ttl * 1000;
  cache.set(key, { data, expires });
}

/**
 * دریافت از cache
 */
export function getCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  // بررسی انقضا
  if (Date.now() > cached.expires) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

/**
 * حذف از cache
 */
export function deleteCache(key: string): void {
  cache.delete(key);
}

/**
 * پاک کردن تمام cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * پاک کردن cache های مرتبط با یک pattern
 */
export function clearCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Cache wrapper برای async functions
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // بررسی cache
  const cached = getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // اجرای function و ذخیره در cache
  const result = await fn();
  setCache(key, result, ttl);
  return result;
}

/**
 * Cache keys
 */
export const CacheKeys = {
  blogs: (filters?: string) => `blogs:${filters || "all"}`,
  blog: (id: number) => `blog:${id}`,
  blogBySlug: (slug: string) => `blog:slug:${slug}`,
  categories: () => "categories:all",
  category: (id: number) => `category:${id}`,
  categoryBySlug: (slug: string) => `category:slug:${slug}`,
  menus: (role: string) => `menus:${role}`,
  ads: (position: string) => `ads:${position}`,
  stats: (type: string) => `stats:${type}`,
};

