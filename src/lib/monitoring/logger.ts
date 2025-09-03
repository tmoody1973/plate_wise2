/**
 * Centralized logging service for PlateWise
 * Provides structured logging with different levels and contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? JSON.stringify(entry.context) : '';
    
    return `[${timestamp}] ${level}: ${entry.message} ${context}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      error,
    };

    const formattedLog = this.formatLog(entry);

    // Console logging
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
        console.error(formattedLog, error);
        break;
    }

    // In production, you might want to send logs to an external service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    // Implement external logging service integration here
    // Examples: Sentry, LogRocket, DataDog, etc.
    try {
      // Example: Send to your logging endpoint
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      // Fail silently to avoid logging loops
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Convenience methods for common use cases
  userAction(action: string, userId: string, metadata?: Record<string, any>) {
    this.info(`User action: ${action}`, {
      userId,
      action,
      metadata,
    });
  }

  apiCall(endpoint: string, method: string, duration: number, status: number) {
    this.info(`API call: ${method} ${endpoint}`, {
      component: 'api',
      metadata: { method, endpoint, duration, status },
    });
  }

  componentError(component: string, error: Error, context?: Record<string, any>) {
    this.error(`Component error in ${component}`, error, {
      component,
      metadata: context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();