import { handler as timeseriesHistoryHandler } from '../../src/handlers/v1/timeseries-history.js';
import { handler as experienceTimelineHandler } from '../../src/handlers/v1/experience-timeline.js';
import { handler as mostStarredHandler } from '../../src/handlers/v1/most-starred.js';
import { handler as userStatsHandler } from '../../src/handlers/v1/user-stats.js';
import { handler as repositoryCardHandler } from '../../src/handlers/v1/repository-card.js';
import { handler as contributionStreakHandler } from '../../src/handlers/v1/contribution-streak.js';
import { handler as skillTableHandler } from '../../src/handlers/v1/skill-table.js';
import { handler as qrCodeHandler } from '../../src/handlers/v1/qr-code.js';

import { createNotFoundSVG } from '../../src/utils/errors.js';

/**
 * Main API router for all endpoints
 * Routes requests to appropriate version handlers
 * @param {Object} event - Netlify function event
 * @param {Object} context - Netlify function context
 * @returns {Object} Response object
 */
export async function handler(event, context) {
  const { path, httpMethod } = event;

  // Log request
  console.log(`[API] ${httpMethod} ${path}`);

  // Only allow GET and OPTIONS methods
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (httpMethod !== 'GET') {
    return createNotFoundSVG('Method');
  }

  // Parse path to extract version and endpoint
  // Expected format: /api/v1/endpoint.svg or /.netlify/functions/api/v1/endpoint.svg
  const pathParts = path.split('/').filter(Boolean);
  
  // Find the version part (v1, v2, etc.)
  const versionIndex = pathParts.findIndex(part => part.match(/^v\d+$/));
  
  if (versionIndex === -1) {
    return createNotFoundSVG('API version');
  }

  const version = pathParts[versionIndex];
  const endpoint = pathParts.slice(versionIndex + 1).join('/');

  // Route based on version
  if (version === 'v1') {
    return routeV1(endpoint, event);
  }

  // Unknown version
  return createNotFoundSVG(`API version ${version}`);
}

/**
 * Route v1 API requests
 * @param {string} endpoint - Endpoint path
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
async function routeV1(endpoint, event) {
  // Route to appropriate handler
  switch (endpoint) {
    case 'timeseries-history.svg':
    case 'timeseries-history':
      return timeseriesHistoryHandler(event);
    
    case 'experience-timeline.svg':
    case 'experience-timeline':
      return experienceTimelineHandler(event);
    
    case 'most-starred.svg':
    case 'most-starred':
      return mostStarredHandler(event);
    
    case 'user-stats.svg':
    case 'user-stats':
      return userStatsHandler(event);
    
    case 'repository-card.svg':
    case 'repository-card':
      return repositoryCardHandler(event);

    case 'contribution-streak.svg':
    case 'contribution-streak':
      return contributionStreakHandler(event);

    case 'skill-table.svg':
    case 'skill-table':
      return skillTableHandler(event);

    case 'qr-code.svg':
    case 'qr-code':
      return qrCodeHandler(event);

    default:
      return createNotFoundSVG(`Endpoint ${endpoint}`);
  }
}
