/**
 * Sanitize error messages to prevent internal information disclosure
 * Removes internal IPs, file paths, stack traces, and other sensitive data
 */

/**
 * Get a readable string from any error (handles empty message, e.g. ECONNREFUSED / AggregateError).
 * @param {Error|unknown} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (error == null) return 'Unknown error';
  if (typeof error === 'string') return error;
  const msg = error?.message;
  if (msg && String(msg).trim()) return String(msg);
  const code = error?.code;
  if (code) return String(code);
  const cause = error?.cause;
  if (cause) {
    const c = cause?.message || cause?.code;
    if (c) return String(c);
  }
  try {
    const s = String(error);
    if (s && s !== '[object Object]') return s;
  } catch (_) {}
  return 'Unknown error';
}

// Patterns to detect and remove internal information
const INTERNAL_IP_PATTERNS = [
  /10\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,  // 10.x.x.x
  /172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}/g,  // 172.16-31.x.x
  /192\.168\.\d{1,3}\.\d{1,3}/g,  // 192.168.x.x
  /127\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,  // 127.x.x.x
  /localhost/g,
];

const FILE_PATH_PATTERNS = [
  /\/var\/www\/html\/[^\s]+/g,
  /\/home\/[^\s]+/g,
  /\/root\/[^\s]+/g,
  /\/usr\/[^\s]+/g,
  /\/etc\/[^\s]+/g,
  /C:\\[^\s]+/g,
  /D:\\[^\s]+/g,
];

/**
 * Sanitize error message to remove sensitive information
 * @param {Error|string} error - Error object or error message string
 * @param {boolean} isProduction - Whether we're in production mode
 * @returns {string} - Sanitized error message
 */
export function sanitizeError(error, isProduction = false) {
  let errorMessage = '';
  
  if (error instanceof Error || (error && typeof error === 'object')) {
    errorMessage = getErrorMessage(error);
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    return 'An error occurred';
  }

  // In production, never expose detailed error messages
  if (isProduction) {
    // Remove all internal IPs
    INTERNAL_IP_PATTERNS.forEach(pattern => {
      errorMessage = errorMessage.replace(pattern, '[internal]');
    });

    // Remove file paths
    FILE_PATH_PATTERNS.forEach(pattern => {
      errorMessage = errorMessage.replace(pattern, '[path]');
    });

    // Remove stack traces
    if (errorMessage.includes('at ') || errorMessage.includes('Stack:')) {
      const lines = errorMessage.split('\n');
      errorMessage = lines[0]; // Keep only first line
    }

    // Remove database connection strings
    errorMessage = errorMessage.replace(/mysql:\/\/[^\s]+/g, '[database]');
    errorMessage = errorMessage.replace(/mongodb:\/\/[^\s]+/g, '[database]');
    errorMessage = errorMessage.replace(/postgres:\/\/[^\s]+/g, '[database]');

    // Remove any remaining IP addresses (public IPs might be OK, but be safe)
    errorMessage = errorMessage.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');

    // Generic error message if too much was removed
    if (errorMessage.length < 10 || errorMessage === '[internal]' || errorMessage === '[path]') {
      return 'An error occurred. Please try again later.';
    }
  }

  // Limit message length
  if (errorMessage.length > 200) {
    errorMessage = errorMessage.substring(0, 200) + '...';
  }

  return errorMessage;
}

/**
 * Get safe error response for API routes
 * @param {Error|string} error - Error object or error message
 * @param {boolean} isProduction - Whether we're in production mode
 * @returns {object} - Safe error response object
 */
export function getSafeErrorResponse(error, isProduction = false) {
  const sanitized = sanitizeError(error, isProduction);
  const rawMessage = getErrorMessage(error);
  return {
    success: false,
    message: sanitized,
    // Only include error details in development (use getErrorMessage so ECONNREFUSED etc. show)
    ...(isProduction ? {} : { error: rawMessage })
  };
}

