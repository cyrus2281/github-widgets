import { generateContributionStreakSVG } from '../../widgets/contribution_streak/generateContributionStreakSVG.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { validateUsername, parseQueryParams, parseBoolean } from '../../utils/validation.js';
import { handleError, createForbiddenSVG, createValidationErrorSVG } from '../../utils/errors.js';


/**
 * Handle contribution streak SVG generation requests
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    // Parse query parameters
    const queryParams = parseQueryParams(event.rawQuery);
    const {
      userName,
      theme = 'radical',
      animationDuration,
      nocache,
    } = queryParams;

    const noCache = parseBoolean(nocache, false);

    // Check LOCK_GITHUB_USER environment variable
    const lockedUser = process.env.LOCK_GITHUB_USER;
    let username;

    if (lockedUser) {
      if (userName) {
        return createForbiddenSVG('Username parameter is not allowed when LOCK_GITHUB_USER is configured');
      }
      username = lockedUser;
      console.log('[Auth] Using locked GitHub user:', username);
    } else {
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
      'contribution-streak',
      username,
      theme,
      animationDuration
    );

    // Check cache
    const cachedResponse = !noCache && cache.get(cacheKey);
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

    // Build options object
    const opts = {};
    if (animationDurationNum !== undefined) {
      opts.animationDuration = animationDurationNum;
    }

    const svg = await generateContributionStreakSVG(username, opts, theme);

    // Cache the response
    if (!noCache) {
      cache.set(cacheKey, svg);
      console.log('[Cache] SET:', cacheKey);
    }

    // Return SVG
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': noCache ? 'no-store, no-cache' : 'public, max-age=3600',
        'X-Cache': 'MISS',
      },
      body: svg,
    };
  } catch (error) {
    return handleError(error);
  }
}
