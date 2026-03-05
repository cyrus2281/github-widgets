/**
 * API Route Definitions
 * 
 * Maps Express routes to existing Netlify Function handlers using the adapter pattern.
 * All handlers are imported from src/handlers/v1/ and wrapped to work with Express.
 */

import express from 'express';
import { wrapHandler } from './adapter.js';

// Import existing Netlify Function handlers
import { handler as userStatsHandler } from '../src/handlers/v1/user-stats.js';
import { handler as repositoryCardHandler } from '../src/handlers/v1/repository-card.js';
import { handler as mostStarredHandler } from '../src/handlers/v1/most-starred.js';
import { handler as timeseriesHistoryHandler } from '../src/handlers/v1/timeseries-history.js';
import { handler as experienceTimelineHandler } from '../src/handlers/v1/experience-timeline.js';

// Import error utility for 404 responses
import { createNotFoundSVG } from '../src/utils/errors.js';

const router = express.Router();

// V1 API Routes - All endpoints return SVG images
router.get(['/v1/user-stats.svg', '/v1/user-stats'], wrapHandler(userStatsHandler));
router.get(['/v1/repository-card.svg', '/v1/repository-card'], wrapHandler(repositoryCardHandler));
router.get(['/v1/most-starred.svg', '/v1/most-starred'], wrapHandler(mostStarredHandler));
router.get(['/v1/timeseries-history.svg', '/v1/timeseries-history'], wrapHandler(timeseriesHistoryHandler));
router.get(['/v1/experience-timeline.svg', '/v1/experience-timeline'], wrapHandler(experienceTimelineHandler));

// OPTIONS support for CORS preflight requests
router.options('*', (req, res) => {
  res.status(204).send();
});

// 404 handler for unknown API endpoints
// Returns an SVG error image to maintain consistency with other endpoints
router.use((req, res) => {
  const response = createNotFoundSVG(`Endpoint ${req.path}`);
  res.status(response.statusCode)
    .set(response.headers)
    .send(response.body);
});

export default router;
