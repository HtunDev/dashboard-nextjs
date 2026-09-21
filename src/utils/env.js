/**
 * Environment utility functions
 */

/**
 * Check if running in development mode
 * Next.js sets NODE_ENV automatically:
 * - 'next dev' → development
 * - 'next build' / 'next start' → production
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in production mode
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get the current NODE_ENV value
 */
export function getNodeEnv() {
  return process.env.NODE_ENV || 'development';
}

