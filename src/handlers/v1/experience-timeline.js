import { generateExperienceTimeline } from '../../widgets/experience_timeline/generateExperienceTimeline.js';
import { cache, generateCacheKey } from '../../utils/cache.js';
import { parseQueryParams } from '../../utils/validation.js';
import { handleError, createValidationErrorSVG } from '../../utils/errors.js';

/**
 * Validate CSV format for experience timeline
 * @param {string} csvString - CSV string to validate
 * @throws {Error} If CSV is invalid
 */
function validateExperienceCSV(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    throw new Error('experienceCSV parameter is required');
  }

  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header and one data row');
  }

  // Validate header
  const header = lines[0].toLowerCase().trim();
  const requiredFields = ['company', 'start', 'end'];
  const optionalFields = ['title', 'logo', 'color'];
  const allFields = [...requiredFields, ...optionalFields];

  const headerFields = header.split(',').map(f => f.trim());
  
  // Check if header matches expected format
  const hasValidHeader = headerFields.length === allFields.length &&
    headerFields.every((field, index) => field === allFields[index]);

  if (!hasValidHeader) {
    throw new Error('CSV header must be: company,start,end,title,logo,color');
  }

  // Validate at least one data row exists
  const dataRows = lines.slice(1).filter(line => line.trim());
  if (dataRows.length === 0) {
    throw new Error('CSV must contain at least one experience entry');
  }

  // Basic validation of data rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const fields = row.split(',');
    
    if (fields.length !== allFields.length) {
      throw new Error(`Row ${i + 2} has incorrect number of fields (expected ${allFields.length}, got ${fields.length})`);
    }

    const company = fields[0].trim();
    const start = fields[1].trim();

    if (!company) {
      throw new Error(`Row ${i + 2}: company is required`);
    }

    if (!start) {
      throw new Error(`Row ${i + 2}: start date is required`);
    }

    // Validate date format (YYYY, YYYY-MM, or YYYY-MM-DD)
    const dateRegex = /^\d{4}(-\d{2}(-\d{2})?)?$/;
    if (!dateRegex.test(start)) {
      throw new Error(`Row ${i + 2}: start date must be in format YYYY, YYYY-MM, or YYYY-MM-DD`);
    }

    // Validate end date if provided
    const end = fields[2].trim();
    if (end && !dateRegex.test(end)) {
      throw new Error(`Row ${i + 2}: end date must be in format YYYY, YYYY-MM, or YYYY-MM-DD (or empty for present)`);
    }
  }
}

/**
 * Handle experience timeline SVG generation requests
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
export async function handler(event) {
  try {
    // Parse query parameters
    const queryParams = parseQueryParams(event.rawQuery);
    const {
      experienceCSV,
      width: widthStr = '1200',
      heightPerLane: heightPerLaneStr = '80',
      marginTop: marginTopStr = '100',
      marginRight: marginRightStr = '30',
      marginBottom: marginBottomStr = '30',
      marginLeft: marginLeftStr = '30',
      embedLogos: embedLogosStr = 'true',
      animationTotalDuration: animationTotalDurationStr = '5',
    } = queryParams;

    const includeStartDate = queryParams.includeStartDate !== 'false';
    const includeEndDate = queryParams.includeEndDate !== 'false';

    // Type conversion and validation
    const width = parseInt(widthStr, 10) || 1200;
    const heightPerLane = parseInt(heightPerLaneStr, 10) || 80;
    const marginTop = parseInt(marginTopStr, 10) || 100;
    const marginRight = parseInt(marginRightStr, 10) || 30;
    const marginBottom = parseInt(marginBottomStr, 10) || 30;
    const marginLeft = parseInt(marginLeftStr, 10) || 30;
    const embedLogos = embedLogosStr === 'true';
    const animationTotalDuration = parseFloat(animationTotalDurationStr) || 5;
    const baseFontSize = queryParams.baseFontSize ? parseInt(queryParams.baseFontSize, 10) : 14;

    // Validate experienceCSV parameter exists
    if (!experienceCSV) {
      return createValidationErrorSVG('experienceCSV', 'experienceCSV query parameter is required');
    }

    // Decode URI component
    let decodedCSV;
    try {
      decodedCSV = decodeURIComponent(experienceCSV);
    } catch (error) {
      return createValidationErrorSVG('experienceCSV', 'Invalid URI encoding in experienceCSV parameter');
    }

    // Validate CSV format
    try {
      validateExperienceCSV(decodedCSV);
    } catch (error) {
      return createValidationErrorSVG('experienceCSV', error.message);
    }

    // Generate cache key based on CSV content and all options
    const cacheKeyOptions = {
      width,
      heightPerLane,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      embedLogos,
      includeStartDate,
      includeEndDate,
      animationTotalDuration,
      baseFontSize,
    };
    const cacheKey = generateCacheKey('experience-timeline', decodedCSV, JSON.stringify(cacheKeyOptions));

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
    const svg = await generateExperienceTimeline(decodedCSV, {
      width,
      heightPerLane,
      margin: {
        top: marginTop,
        right: marginRight,
        bottom: marginBottom,
        left: marginLeft,
      },
      embedLogos,
      includeStartDate,
      includeEndDate,
      animationTotalDuration,
      baseFontSize,
    });

    // Cache the response
    cache.set(cacheKey, svg);
    console.log('[Cache] SET:', cacheKey.substring(0, 50) + '...');

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