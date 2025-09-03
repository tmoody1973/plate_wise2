/**
 * Centralized error handling service for PlateWise
 * Provides consistent error processing, logging, and user notification
 */

import { logger } from '../monitoring/logger';
import { BaseError, ErrorSeverity, ErrorCategory } from './error-types';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  reportError?: boolean;
}

class ErrorHandler {
  private defaultOptions: ErrorHandlerOptions = {
    showToast: true,
    logError: true,
    reportError: true,
  };

  /**
   * Handle any error with appropriate logging and user feedback
   */
  handle(error: Error | BaseError, options?: ErrorHandlerOptions): void {
    const opts = { ...this.defaultOptions, ...options };

    // Log the error
    if (opts.logError) {
      this.logError(error);
    }

    // Report to external service if needed
    if (opts.reportError && this.shouldReport(error)) {
      this.reportError(error);
    }

    // Show user notification
    if (opts.showToast) {
      this.showUserNotification(error);
    }
  }

  /**
   * Log error with appropriate level based on severity
   */
  private logError(error: Error | BaseError): void {
    if (error instanceof BaseError) {
      const context = {
        category: error.category,
        severity: error.severity,
        component: error.context?.component,
        userId: error.context?.userId,
        metadata: error.context?.metadata,
      };

      switch (error.severity) {
        case ErrorSeverity.LOW:
          logger.info(`${error.category}: ${error.message}`, context);
          break;
        case ErrorSeverity.MEDIUM:
          logger.warn(`${error.category}: ${error.message}`, context);
          break;
        case ErrorSeverity.HIGH:
        case ErrorSeverity.CRITICAL:
          logger.error(`${error.category}: ${error.message}`, error, context);
          break;
      }
    } else {
      logger.error('Unhandled error', error);
    }
  }

  /**
   * Determine if error should be reported to external service
   */
  private shouldReport(error: Error | BaseError): boolean {
    if (error instanceof BaseError) {
      // Don't report validation errors or low severity errors
      return error.severity !== ErrorSeverity.LOW && 
             error.category !== ErrorCategory.VALIDATION;
    }
    
    // Report all unhandled errors
    return true;
  }

  /**
   * Report error to external monitoring service
   */
  private async reportError(error: Error | BaseError): Promise<void> {
    try {
      // In a real application, you would integrate with services like:
      // - Sentry
      // - Bugsnag
      // - Rollbar
      // - Custom error reporting endpoint

      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        ...(error instanceof BaseError && {
          category: error.category,
          severity: error.severity,
          context: error.context,
        }),
      };

      // Example: Send to your error reporting endpoint
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });

      console.log('Error reported:', errorData);
    } catch (reportingError) {
      logger.error('Failed to report error', reportingError as Error);
    }
  }

  /**
   * Show appropriate user notification based on error type
   */
  private showUserNotification(error: Error | BaseError): void {
    // This would integrate with your toast/notification system
    const message = error instanceof BaseError ? error.userMessage : 'An unexpected error occurred';
    
    // For now, we'll just log it. In a real app, you'd use your toast system:
    // toast.error(message);
    console.log('User notification:', message);
  }

  /**
   * Wrap async functions with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error as Error, options);
      return null;
    }
  }

  /**
   * Wrap sync functions with error handling
   */
  wrapSync<T>(
    fn: () => T,
    options?: ErrorHandlerOptions
  ): T | null {
    try {
      return fn();
    } catch (error) {
      this.handle(error as Error, options);
      return null;
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();