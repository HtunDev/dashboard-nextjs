'use client';

import { useEffect } from 'react';

export default function RuntimeErrorHandler() {
  useEffect(() => {
    // Handle runtime.lastError from browser extensions
    const handleRuntimeError = (event) => {
      if (event.detail && event.detail.error) {
        // Don't propagate extension errors
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Handle general errors
    const handleError = () => {
      // Don't prevent default for actual application errors
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('runtime-error', handleRuntimeError);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('runtime-error', handleRuntimeError);
    };
  }, []);

  return null; // This component doesn't render anything
}
