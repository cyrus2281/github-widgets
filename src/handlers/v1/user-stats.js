import { generateUserStatsSVG } from '../../widgets/user_stats/generateUserStatsSVG.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { validateUsername, parseQueryParams } from '../../utils/validation.js';
import { handleError, createForbiddenSVG, createValidationErrorSVG } from '../../utils/errors.js';

/**
 * Parse boolean parameter from query string
 * @param {string|undefined} value - Query parameter value
 * @param {boolean} defaultValue - Default value if parameter is not provided
 * @returns {boolean} Parsed boolean value
 */
function parseBoolean(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  return value !== 'false';
}

/**
 * Handle user stats SVG generation requests
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
      width,
      animationDuration,
      showHandle,
      showStars,
      showCommits,
      showCommitsThisYear,
      showPRs,
      showIssues,
      showRepos,
      showContributedTo,
      showLogo,
    } = queryParams;

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

    // Validate width parameter if provided
    let widthNum;
    if (width !== undefined) {
      widthNum = parseInt(width, 10);
      if (isNaN(widthNum) || widthNum < 300 || widthNum > 1000) {
        return createValidationErrorSVG('width', 'width must be a number between 300 and 1000');
      }
    }

    // Validate animationDuration parameter if provided
    let animationDurationNum;
    if (animationDuration !== undefined) {
      animationDurationNum = parseFloat(animationDuration);
      if (isNaN(animationDurationNum) || animationDurationNum < 0.5 || animationDurationNum > 10) {
        return createValidationErrorSVG('animationDuration', 'animationDuration must be a number between 0.5 and 10');
      }
    }

    // Parse boolean options
    const showHandleBool = parseBoolean(showHandle, true);
    const showStarsBool = parseBoolean(showStars, true);
    const showCommitsBool = parseBoolean(showCommits, true);
    const showCommitsThisYearBool = parseBoolean(showCommitsThisYear, true);
    const showPRsBool = parseBoolean(showPRs, true);
    const showIssuesBool = parseBoolean(showIssues, true);
    const showReposBool = parseBoolean(showRepos, true);
    const showContributedToBool = parseBoolean(showContributedTo, true);
    const showLogoBool = parseBoolean(showLogo, true);

    if (!showLogoBool && !width) {
      widthNum = 300;
    }

    // Generate cache key
    const cacheKey = generateCacheKey(
      'user-stats',
      username,
      theme,
      width,
      animationDuration,
      showHandle,
      showStars,
      showCommits,
      showCommitsThisYear,
      showPRs,
      showIssues,
      showRepos,
      showContributedTo,
      showLogo
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

    // Build options object
    const opts = {
      showHandle: showHandleBool,
      showStars: showStarsBool,
      showCommits: showCommitsBool,
      showCommitsThisYear: showCommitsThisYearBool,
      showPRs: showPRsBool,
      showIssues: showIssuesBool,
      showRepos: showReposBool,
      showContributedTo: showContributedToBool,
      showLogo: showLogoBool,
    };

    if (widthNum !== undefined) {
      opts.width = widthNum;
    }
    if (animationDurationNum !== undefined) {
      opts.animationDuration = animationDurationNum;
    }

    const svg = await generateUserStatsSVG(username, opts, theme);

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