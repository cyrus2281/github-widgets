import { generateRepositoryCard } from "../../widgets/repository_card/generateRepositoryCard.js";
import { cache, generateCacheKey } from "../../utils/cache.js";
import {
  validateUsername,
  parseQueryParams,
  parseBoolean,
} from "../../utils/validation.js";
import {
  handleError,
  createForbiddenSVG,
  createValidationErrorSVG,
} from "../../utils/errors.js";

/**
 * Handle repository card SVG generation requests
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    // Parse query parameters
    const queryParams = parseQueryParams(event.rawQuery);
    const {
      userName,
      repoName,
      theme = "radical",
      showUserName,
      showLanguage,
      showStars,
      showForks,
      width,
      height,
    } = queryParams;

    // Check LOCK_GITHUB_USER environment variable
    const lockedUser = process.env.LOCK_GITHUB_USER;
    let username;

    if (lockedUser) {
      // If LOCK_GITHUB_USER is set and userName is provided, return error
      if (userName) {
        return createForbiddenSVG(
          "Username parameter is not allowed when LOCK_GITHUB_USER is configured"
        );
      }
      // Use locked user
      username = lockedUser;
      console.log("[Auth] Using locked GitHub user:", username);
    } else {
      // LOCK_GITHUB_USER not set, userName is required
      if (!userName) {
        return createValidationErrorSVG(
          "userName",
          "userName query parameter is required"
        );
      }
      username = userName;
    }

    // Validate username
    try {
      validateUsername(username);
    } catch (error) {
      return createValidationErrorSVG("userName", error.message);
    }

    // Validate repoName is required
    if (!repoName) {
      return createValidationErrorSVG(
        "repoName",
        "repoName query parameter is required"
      );
    }

    // Validate repoName format (alphanumeric, hyphens, underscores, dots)
    if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
      return createValidationErrorSVG(
        "repoName",
        "repoName contains invalid characters"
      );
    }

    // Validate width parameter if provided
    let widthNum;
    if (width !== undefined) {
      widthNum = parseInt(width, 10);
      if (isNaN(widthNum) || widthNum < 300 || widthNum > 600) {
        return createValidationErrorSVG(
          "width",
          "width must be a number between 300 and 600"
        );
      }
    }

    // Validate height parameter if provided
    let heightNum;
    if (height !== undefined) {
      heightNum = parseInt(height, 10);
      if (isNaN(heightNum) || heightNum < 100 || heightNum > 200) {
        return createValidationErrorSVG(
          "height",
          "height must be a number between 100 and 200"
        );
      }
    }

    // Parse boolean options
    const showUserNameBool = parseBoolean(showUserName, true);
    const showLanguageBool = parseBoolean(showLanguage, true);
    const showStarsBool = parseBoolean(showStars, true);
    const showForksBool = parseBoolean(showForks, true);

    // Generate cache key
    const cacheKey = generateCacheKey(
      "repository-card",
      username,
      repoName,
      theme,
      showUserName,
      showLanguage,
      showStars,
      showForks,
      width,
      height
    );

    // Check cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log("[Cache] HIT:", cacheKey);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
          "X-Cache": "HIT",
        },
        body: cachedResponse,
      };
    }

    console.log("[Cache] MISS:", cacheKey);

    // Check GitHub token is configured
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN environment variable is not configured");
    }

    // Build options object
    const opts = {
      showUserName: showUserNameBool,
      showLanguage: showLanguageBool,
      showStars: showStarsBool,
      showForks: showForksBool,
    };

    if (widthNum !== undefined) {
      opts.width = widthNum;
    }
    if (heightNum !== undefined) {
      opts.height = heightNum;
    }

    // Generate SVG (generator now handles data fetching internally)
    const svg = await generateRepositoryCard(username, repoName, opts, theme);

    // Cache the response
    cache.set(cacheKey, svg);
    console.log("[Cache] SET:", cacheKey);

    // Return SVG
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "MISS",
      },
      body: svg,
    };
  } catch (error) {
    return handleError(error);
  }
}
