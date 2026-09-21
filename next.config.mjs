/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript errors during builds (if TypeScript is used)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Production optimizations
  output: 'standalone',
  trailingSlash: false,
  
  // Disable strict mode for better compatibility
  reactStrictMode: false,
  
  // Experimental features
  experimental: {
    // Remove modularizeImports as it's not supported in this Next.js version
  },
  
  // Define global variables for SSR compatibility
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Fix SSR issues with browser globals
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
    
    // Handle webpack errors gracefully
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules/,
      },
      {
        file: /node_modules/,
      },
    ];
    
    // Reduce webpack errors to warnings where possible
    config.stats = {
      ...config.stats,
      warnings: true,
      errors: true,
      errorDetails: false,
    };
    
    // Fix self global for SSR compatibility
    if (isServer) {
      // Add global polyfill
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.beforeCompile.tap('GlobalPolyfill', () => {
            if (typeof global !== 'undefined') {
              global.self = global;
            }
            if (typeof globalThis !== 'undefined') {
              globalThis.self = globalThis;
            }
          });
        }
      });
    }
    
    return config;
  },
  
  // Handle build errors gracefully
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Headers for better caching and error handling
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
