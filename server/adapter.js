/**
 * Event Adapter for Express to Netlify Event Format
 *
 * This adapter transforms Express request/response objects to/from Netlify event format,
 * enabling 100% code reuse of existing Netlify Function handlers without modifications.
 *
 * For the Express server path, wrapHandler() uses HTTP chunked transfer encoding
 * with periodic XML comment heartbeats to keep connections alive during slow
 * (cache-miss) SVG generation — preventing proxy/browser idle-timeout disconnects.
 */

import { handleError } from '../src/utils/errors.js';

// In-flight deduplication: concurrent requests for the same URL share one handler
// execution instead of spawning duplicate GitHub API calls.
// Key: req.url (full path + query string)
// Value: Promise<netlifyResponse>
const inFlight = new Map();

// Interval between heartbeat chunks. Must be well below common proxy timeouts
// (GitHub camo: ~10s, nginx default: 60s). 1500ms gives ~6 beats before a 10s timeout.
const HEARTBEAT_MS = 1500;

// XML comment chunk: valid per XML 1.0 §2.5, ignored by SVG parsers,
// and does not affect image rendering.
const HEARTBEAT_CHUNK = '<!-- heartbeat -->\n';

/**
 * Convert Express request to Netlify event format
 *
 * @param {import('express').Request} req - Express request object
 * @returns {Object} Netlify-compatible event object
 */
export function expressToNetlifyEvent(req) {
  // Extract raw query string from URL
  const urlParts = req.url.split('?');
  const rawQuery = urlParts.length > 1 ? urlParts[1] : '';

  return {
    path: req.path,
    httpMethod: req.method,
    rawQuery: rawQuery,
    queryStringParameters: req.query,
    headers: req.headers,
    body: req.body ? JSON.stringify(req.body) : null,
  };
}

/**
 * Send Netlify response through Express response object
 *
 * @param {import('express').Response} res - Express response object
 * @param {Object} netlifyResponse - Netlify handler response object
 * @param {number} netlifyResponse.statusCode - HTTP status code
 * @param {Object} netlifyResponse.headers - Response headers
 * @param {string} netlifyResponse.body - Response body
 */
export function sendNetlifyResponse(res, netlifyResponse) {
  const { statusCode, headers, body } = netlifyResponse;

  // Set status code
  res.status(statusCode);

  // Set headers
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  // Send body
  res.send(body);
}

/**
 * Wrap a Netlify handler function for use with Express
 *
 * Immediately commits 200 + headers via res.writeHead() then starts a periodic
 * XML comment heartbeat to keep the connection alive during slow SVG generation.
 * Once the handler resolves (or rejects), the heartbeat is cleared and the SVG
 * body (or error card) is written and the response is ended.
 *
 * Also provides in-flight deduplication: concurrent identical requests share
 * one handler execution instead of spawning redundant GitHub API calls.
 *
 * @param {Function} handler - Netlify handler function
 * @returns {Function} Express middleware function
 */
export function wrapHandler(handler) {
  return async (req, res) => {
    // Commit 200 + headers immediately so the connection is kept alive.
    // Spreading res.getHeaders() propagates CORS headers set by cors() middleware.
    // Once res.writeHead() is called the status code is locked — errors are
    // returned as SVG error cards in the body (same pattern used throughout this
    // codebase) rather than 4xx/5xx status codes.
    res.writeHead(200, {
      ...res.getHeaders(),
      'Content-Type': 'image/svg+xml',
    });

    // Heartbeat: write XML comment chunks to keep the connection active.
    // For cache hits the handler resolves in <50ms — the interval never fires.
    let heartbeat = setInterval(() => {
      try {
        res.write(HEARTBEAT_CHUNK);
      } catch {
        // Client disconnected mid-generation; interval will be cleared below.
      }
    }, HEARTBEAT_MS);

    // In-flight deduplication: if an identical URL is already being generated,
    // attach to its promise rather than spawning a new handler call.
    const key = req.url;
    if (!inFlight.has(key)) {
      const promise = handler(expressToNetlifyEvent(req)).finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, promise);
    }

    try {
      const response = await inFlight.get(key);
      clearInterval(heartbeat);
      res.write(response.body);
      res.end();
    } catch (err) {
      clearInterval(heartbeat);
      // Headers are already committed — send SVG error card as body.
      // Do NOT call next(err): that causes Express to emit warnings and close
      // the socket without a clean response.
      try {
        res.write(handleError(err).body);
      } catch {
        // Client already disconnected.
      }
      res.end();
    }
  };
}
