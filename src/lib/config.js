/**
 * Shared configuration constants
 */

// JWT Secret - MUST be set in production via environment variable
export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Please set it in your environment variables.'
      );
    }
    // Development fallback - warn but allow
    console.warn(
      '⚠️  WARNING: JWT_SECRET not set. Using insecure default for development only. ' +
      'Set JWT_SECRET environment variable for production.'
    );
    return 'your-secret-key';
  }
  
  return secret;
})();

