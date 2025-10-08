import { generateMostStarredSVG } from '../../widgets/most_starred/generateMostStarredSVG.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { validateUsername, parseQueryParams } from '../../utils/validation.js';
import { handleError, createForbiddenSVG, createValidationErrorSVG } from '../../utils/errors.js';

/**
 * Handle most starred repositories SVG generation requests
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    // Parse query parameters
    const queryParams = parseQueryParams(event.rawQuery);
    const { userName, top = '3', title, theme = 'radical', animationDuration } = queryParams;

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

    // Validate top parameter
    const topNum = parseInt(top, 10);
    if (isNaN(topNum) || topNum < 1 || topNum > 10) {
      return createValidationErrorSVG('top', 'top must be a number between 1 and 10');
    }

    // Validate animationDuration parameter if provided
    let animationDurationNum;
    if (animationDuration !== undefined) {
      animationDurationNum = parseFloat(animationDuration);
      if (isNaN(animationDurationNum) || animationDurationNum < 0.5 || animationDurationNum > 10) {
        return createValidationErrorSVG('animationDuration', 'animationDuration must be a number between 0.5 and 10');
      }
    }

    // Generate cache key
    const cacheKey = generateCacheKey(
      "most-starred",
      userName,
      top,
      title,
      theme,
      animationDuration
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

    const opts = {
      top: topNum,
    };
    if (title) {
      opts.title = title;
    }
    if (animationDurationNum !== undefined) {
      opts.animationDuration = animationDurationNum;
    }

    const svg = await generateMostStarredSVG(username, opts, theme);

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