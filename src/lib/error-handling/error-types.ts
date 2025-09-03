/**
 * Custom error types for PlateWise application
 * Provides structured error handling with proper categorization
 */

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly userMessage: string;

  constructor(
    message: string,
    userMessage: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.userMessage = userMessage;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Authentication Errors
export class AuthenticationError extends BaseError {
  constructor(message: string, userMessage: string = 'Authentication failed', context?: ErrorContext) {
    super(message, userMessage, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string, userMessage: string = 'Access denied', context?: ErrorContext) {
    super(message, userMessage, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, context);
  }
}

// Validation Errors
export class ValidationError extends BaseError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    userMessage: string = 'Invalid input provided',
    context?: ErrorContext
  ) {
    super(message, userMessage, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
    this.field = field;
  }
}

// Network Errors
export class NetworkError extends BaseError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    userMessage: string = 'Network connection failed',
    context?: ErrorContext
  ) {
    super(message, userMessage, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context);
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

// Database Errors
export class DatabaseError extends BaseError {
  public readonly query?: string;

  constructor(
    message: string,
    query?: string,
    userMessage: string = 'Database operation failed',
    context?: ErrorContext
  ) {
    super(message, userMessage, ErrorCategory.DATABASE, ErrorSeverity.HIGH, context);
    this.query = query;
  }
}

// External API Errors
export class ExternalApiError extends BaseError {
  public readonly service: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    service: string,
    statusCode?: number,
    userMessage: string = 'External service unavailable',
    context?: ErrorContext
  ) {
    super(message, userMessage, ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, context);
    this.service = service;
    this.statusCode = statusCode;
  }
}

// Business Logic Errors
export class BusinessLogicError extends BaseError {
  constructor(
    message: string,
    userMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ) {
    super(message, userMessage, ErrorCategory.BUSINESS_LOGIC, severity, context);
  }
}

// System Errors
export class SystemError extends BaseError {
  constructor(
    message: string,
    userMessage: string = 'System error occurred',
    context?: ErrorContext
  ) {
    super(message, userMessage, ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, context);
  }
}