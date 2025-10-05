/**
 * Validate GitHub username format
 * @param {string} username - GitHub username to validate
 * @returns {boolean} True if valid
 * @throws {Error} If username is invalid
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }

  // GitHub username rules:
  // - May only contain alphanumeric characters or hyphens
  // - Cannot have multiple consecutive hyphens
  // - Cannot begin or end with a hyphen
  // - Maximum 39 characters
  const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

  if (!usernameRegex.test(username)) {
    throw new Error('Invalid GitHub username format');
  }

  return true;
}

/**
 * Parse and validate date range string
 * @param {string} rangeString - Date range in format YYYY-MM-DD:YYYY-MM-DD
 * @returns {{startDate: Date, endDate: Date, startDateStr: string, endDateStr: string}} Parsed dates
 * @throws {Error} If range format is invalid
 */
export function validateDateRange(rangeString) {
  if (!rangeString || typeof rangeString !== 'string') {
    throw new Error('Date range is required');
  }

  const parts = rangeString.split(':');
  if (parts.length !== 2) {
    throw new Error('Date range must be in format YYYY-MM-DD:YYYY-MM-DD');
  }

  const [startStr, endStr] = parts;

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startStr) || !dateRegex.test(endStr)) {
    throw new Error('Dates must be in format YYYY-MM-DD');
  }

  // Parse dates
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date in range');
  }

  // Check if start is before end
  if (startDate.getTime() > endDate.getTime()) {
    throw new Error('Start date must be before end date');
  }

  // Check if range is within 365 days
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    throw new Error('Date range cannot exceed 365 days');
  }

  return {
    startDate,
    endDate,
    startDateStr: startStr,
    endDateStr: endStr,
  };
}

/**
 * Parse query parameters from URL
 * @param {string} queryString - Query string from URL
 * @returns {Object} Parsed query parameters
 */
export function parseQueryParams(queryString) {
  const params = {};
  if (!queryString) return params;

  const searchParams = new URLSearchParams(queryString);
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return params;
}