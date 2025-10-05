import { LRUCache } from 'lru-cache';

/**
 * Create an LRU cache with TTL support for caching API responses
 * @param {number} maxSize - Maximum number of entries (default: 100)
 * @param {number} ttl - Time to live in milliseconds (default: 3600000 = 1 hour)
 * @returns {LRUCache} Configured LRU cache instance
 */
export function createCache(maxSize = 100, ttl = 3600000) {
  return new LRUCache({
    max: maxSize,
    ttl: ttl,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  });
}

/**
 * Generate a cache key for timeseries history requests
 * @param {string} username - GitHub username
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @returns {string} Cache key
 */
export function generateCacheKey(username, startDate, endDate) {
  return `timeseries-history:${username}:${startDate}:${endDate}`;
}

// Create singleton cache instance with environment variable configuration
const maxSize = parseInt(process.env.CACHE_MAX_SIZE || '100', 10);
const ttl = parseInt(process.env.CACHE_TTL_MS || '3600000', 10);

export const cache = createCache(maxSize, ttl);