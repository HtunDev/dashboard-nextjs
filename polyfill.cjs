// Polyfill for Node.js globals in browser environment
if (typeof global === 'undefined') {
  var global = globalThis;
}

if (typeof globalThis === 'undefined') {
  var globalThis = global;
}

// Ensure self is available
if (typeof self === 'undefined') {
  var self = globalThis;
}

// Polyfill for process if needed
if (typeof process === 'undefined') {
  var process = {
    env: {},
    cwd: () => '/',
    nextTick: (fn) => setTimeout(fn, 0)
  };
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
