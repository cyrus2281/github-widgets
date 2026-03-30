import { generateQRCodeSVG } from '../../widgets/qr_code/generateQRCodeSVG.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { parseQueryParams, parseBoolean } from '../../utils/validation.js';
import { handleError, createValidationErrorSVG } from '../../utils/errors.js';

/**
 * Handle QR code SVG generation requests.
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    const queryParams = parseQueryParams(event.rawQuery);
    const {
      content,
      logo = '',
      logoColor = '',
      useThemeColor: useThemeColorStr = 'false',
      title = '',
      size: sizeStr = '300',
      margin: marginStr = '2',
      animate: animateStr = 'false',
      animationDuration: animationDurationStr = '3',
      theme = 'radical',
      nocache,
    } = queryParams;

    const noCache = parseBoolean(nocache, false);

    // Validate content parameter
    if (!content) {
      return createValidationErrorSVG('content', 'content query parameter is required');
    }

    let decodedContent;
    try {
      decodedContent = decodeURIComponent(content);
    } catch {
      return createValidationErrorSVG('content', 'Invalid URI encoding in content parameter');
    }

    if (decodedContent.length === 0) {
      return createValidationErrorSVG('content', 'content must not be empty');
    }

    if (decodedContent.length > 2000) {
      return createValidationErrorSVG('content', 'content exceeds maximum length of 2000 characters');
    }

    // Parse and clamp numeric params
    const size = Math.max(100, Math.min(800, parseInt(sizeStr, 10) || 300));
    const margin = Math.max(0, Math.min(4, parseInt(marginStr, 10) || 2));
    const animationDuration = Math.max(1, Math.min(10, parseFloat(animationDurationStr) || 3));
    const animate = parseBoolean(animateStr, false);
    const useThemeColor = parseBoolean(useThemeColorStr, false);

    const opts = {
      logo: logo || '',
      logoColor: logoColor || '',
      useThemeColor,
      title,
      size,
      margin,
      animate,
      animationDuration,
    };

    // Generate cache key
    const cacheKey = generateCacheKey('qr-code', decodedContent, logo, logoColor, useThemeColor, title, size, margin, animate, animationDuration, theme);

    // Check cache
    const cachedResponse = !noCache && cache.get(cacheKey);
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
    const svg = await generateQRCodeSVG(decodedContent, opts, theme);

    // Cache the response
    if (!noCache) {
      cache.set(cacheKey, svg);
      console.log('[Cache] SET:', cacheKey.substring(0, 50) + '...');
    }

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
