/**
 * Event Adapter for Express to Netlify Event Format
 * 
 * This adapter transforms Express request/response objects to/from Netlify event format,
 * enabling 100% code reuse of existing Netlify Function handlers without modifications.
 */

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
    body: req.body ? JSON.stringify(req.body) : null
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
 * This higher-order function creates Express middleware that:
 * 1. Transforms Express request to Netlify event format
 * 2. Calls the original Netlify handler
 * 3. Transforms Netlify response back to Express response
 * 4. Handles errors and passes them to Express error middleware
 * 
 * @param {Function} handler - Netlify handler function (async function that takes event and returns response)
 * @returns {Function} Express middleware function
 */
export function wrapHandler(handler) {
  return async (req, res, next) => {
    try {
      // Transform Express request to Netlify event
      const event = expressToNetlifyEvent(req);

      // Call the original Netlify handler
      const response = await handler(event);

      // Transform and send Netlify response through Express
      sendNetlifyResponse(res, response);
    } catch (error) {
      // Pass errors to Express error handling middleware
      next(error);
    }
  };
}
