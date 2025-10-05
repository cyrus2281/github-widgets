import { generateActivitySVG } from '../../github_timeseries/generateActivitySVG.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { validateUsername, validateDateRange, parseQueryParams } from '../../utils/validation.js';
import { handleError, createForbiddenSVG, createValidationErrorSVG } from '../../utils/errors.js';

/**
 * Handle timeseries history SVG generation requests
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    // Parse query parameters
    const queryParams = parseQueryParams(event.rawQuery);
    const { userName, range } = queryParams;

    // Check LOCK_GITHUB_USER environment variable
    const lockedUser = process.env.LOCK_GITHUB_USER;
    let username;

    if (lockedUser) {
      // If LOCK_GITHUB_USER is set and userName is provided, return error
      if (userName) {
        return createForbiddenSVG('Username parameter is not allowed when LOCK_GITHUB_USER is configured');
      }
      // Use locked user
      username = lockedUser;
      console.log('[Auth] Using locked GitHub user:', username);
    } else {
      // LOCK_GITHUB_USER not set, userName is required
      if (!userName) {
        return createValidationErrorSVG('userName', 'userName query parameter is required');
      }
      username = userName;
    }

    // Validate username
    try {
      validateUsername(username);
    } catch (error) {
      return createValidationErrorSVG('userName', error.message);
    }

    // Validate date range if provided
    let dateRange = null;
    if (range) {
      try {
        dateRange = validateDateRange(range);
      } catch (error) {
        return createValidationErrorSVG('range', error.message);
      }
    }

    // Generate cache key
    const cacheKey = generateCacheKey(
      username,
      dateRange?.startDateStr || 'default',
      dateRange?.endDateStr || 'default'
    );

    // Check cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log('[Cache] HIT:', cacheKey);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT',
        },
        body: cachedResponse,
      };
    }

    console.log('[Cache] MISS:', cacheKey);

    // Generate SVG
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is not configured');
    }

    const svg = await generateActivitySVG(username, {
      range: range || undefined,
      githubToken,
    });

    // Cache the response
    cache.set(cacheKey, svg);
    console.log('[Cache] SET:', cacheKey);

    // Return SVG
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS',
      },
      body: svg,
    };
  } catch (error) {
    return handleError(error);
  }
}