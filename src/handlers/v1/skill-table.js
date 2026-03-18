import { generateSkillTableSVG } from '../../widgets/skill_table/generateSkillTableSVG.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { parseQueryParams, parseBoolean } from '../../utils/validation.js';
import { handleError, createValidationErrorSVG } from '../../utils/errors.js';

/**
 * Validate the skills input string.
 * @param {string} skillsString - Decoded skills input
 * @throws {Error} If input is invalid
 */
function validateSkillsInput(skillsString) {
  if (!skillsString || typeof skillsString !== 'string') {
    throw new Error('skills parameter is required');
  }

  if (skillsString.length > 10000) {
    throw new Error('skills parameter exceeds maximum length of 10000 characters');
  }

  const segments = skillsString.split('|').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error('skills parameter must contain at least one entry');
  }

  // Check that at least one skill (non-header) entry exists
  const hasSkill = segments.some(s => !s.match(/^--(.+)--$/));
  if (!hasSkill) {
    throw new Error('skills parameter must contain at least one skill entry (not just section headers)');
  }
}

/**
 * Handle skill table SVG generation requests.
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    const queryParams = parseQueryParams(event.rawQuery);
    const {
      skills,
      columns: columnsStr = '4',
      title = '',
      subtitle = '',
      showTitles: showTitlesStr = 'true',
      iconSize: iconSizeStr = '48',
      useOriginalColors: useOriginalColorsStr = 'true',
      iconColor = '',
      gap: gapStr = '16',
      animationDuration: animationDurationStr = '1',
      theme = 'radical',
    } = queryParams;

    // Validate skills parameter
    if (!skills) {
      return createValidationErrorSVG('skills', 'skills query parameter is required');
    }

    // Decode URI component
    let decodedSkills;
    try {
      decodedSkills = decodeURIComponent(skills);
    } catch {
      return createValidationErrorSVG('skills', 'Invalid URI encoding in skills parameter');
    }

    // Validate input
    try {
      validateSkillsInput(decodedSkills);
    } catch (error) {
      return createValidationErrorSVG('skills', error.message);
    }

    // Parse and clamp numeric params
    const columns = Math.max(1, Math.min(10, parseInt(columnsStr, 10) || 4));
    const iconSize = Math.max(16, Math.min(128, parseInt(iconSizeStr, 10) || 48));
    const gap = Math.max(0, Math.min(64, parseInt(gapStr, 10) || 16));
    const animationDuration = Math.max(0.5, Math.min(10, parseFloat(animationDurationStr) || 1));
    const showTitles = parseBoolean(showTitlesStr, true);
    const useOriginalColors = parseBoolean(useOriginalColorsStr, true);

    const opts = {
      columns,
      title,
      subtitle,
      showTitles,
      iconSize,
      useOriginalColors,
      iconColor: iconColor || null,
      gap,
      animationDuration,
    };

    // Generate cache key
    const cacheKey = generateCacheKey('skill-table', decodedSkills, JSON.stringify(opts), theme);

    // Check cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log('[Cache] HIT:', cacheKey.substring(0, 50) + '...');
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

    console.log('[Cache] MISS:', cacheKey.substring(0, 50) + '...');

    // Generate SVG
    const svg = await generateSkillTableSVG(decodedSkills, opts, theme);

    // Cache the response
    cache.set(cacheKey, svg);
    console.log('[Cache] SET:', cacheKey.substring(0, 50) + '...');

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
