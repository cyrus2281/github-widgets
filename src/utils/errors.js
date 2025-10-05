/**
 * Create an error SVG response
 * @param {string} message - Error message to display
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Response object with SVG content
 */
export function createErrorSVG(message, statusCode = 500) {
  const width = 800;
  const height = 200;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Error: ${escapeXML(message)}">
  <defs>
    <style>
      .error-bg { fill: #0b1020; }
      .error-border { fill: none; stroke: #ff6b6b; stroke-width: 2; }
      .error-icon { fill: #ff6b6b; }
      .error-title { font: 700 18px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: #ff6b6b; }
      .error-message { font: 500 14px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: #cbd5e1; }
      .error-code { font: 400 12px "SFMono-Regular", ui-monospace, "Roboto Mono", monospace; fill: #94a3b8; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" rx="16" class="error-bg"/>
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="14" class="error-border"/>
  
  <!-- Error Icon -->
  <circle cx="60" cy="${height / 2}" r="24" class="error-icon" opacity="0.2"/>
  <path d="M 60 ${height / 2 - 12} L 60 ${height / 2 + 4}" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>
  <circle cx="60" cy="${height / 2 + 12}" r="2" class="error-icon"/>
  
  <!-- Error Text -->
  <text x="110" y="${height / 2 - 10}" class="error-title">Error</text>
  <text x="110" y="${height / 2 + 15}" class="error-message">${escapeXML(message)}</text>
  <text x="110" y="${height / 2 + 35}" class="error-code">Status: ${statusCode}</text>
</svg>`;

  return {
    statusCode,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: svg,
  };
}

/**
 * Create a validation error SVG
 * @param {string} field - Field that failed validation
 * @param {string} message - Validation error message
 * @returns {Object} Response object with SVG content
 */
export function createValidationErrorSVG(field, message) {
  const fullMessage = field ? `${field}: ${message}` : message;
  return createErrorSVG(fullMessage, 400);
}

/**
 * Create a not found error SVG
 * @param {string} resource - Resource that was not found
 * @returns {Object} Response object with SVG content
 */
export function createNotFoundSVG(resource = 'Resource') {
  return createErrorSVG(`${resource} not found`, 404);
}

/**
 * Create a forbidden error SVG
 * @param {string} message - Forbidden message
 * @returns {Object} Response object with SVG content
 */
export function createForbiddenSVG(message) {
  return createErrorSVG(message, 403);
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Handle errors and return appropriate SVG response
 * @param {Error} error - Error object
 * @returns {Object} Response object with SVG content
 */
export function handleError(error) {
  console.error('[Error]', error.message, error.stack);

  // Determine status code based on error message
  let statusCode = 500;
  let message = error.message || 'An unexpected error occurred';

  if (message.includes('not found') || message.includes('User "')) {
    statusCode = 404;
  } else if (
    message.includes('required') ||
    message.includes('Invalid') ||
    message.includes('must be') ||
    message.includes('format') ||
    message.includes('cannot exceed')
  ) {
    statusCode = 400;
  } else if (message.includes('GITHUB_TOKEN')) {
    statusCode = 500;
    message = 'Server configuration error';
  }

  return createErrorSVG(message, statusCode);
}