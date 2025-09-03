/**
 * External APIs Index
 * Unified exports for all external API integrations
 */

// Grocery and Pricing Services
export { krogerService, KrogerService } from './kroger-service';
export { priceComparisonService, PriceComparisonService } from './price-comparison';

// Recipe and Nutrition Services
export { spoonacularService, SpoonacularService } from './spoonacular-service';
export { recipeService as externalRecipeService, RecipeService as ExternalRecipeService } from './recipe-service';

// Voice Services
export { elevenLabsService, ElevenLabsService } from './elevenlabs-service';
export { voiceInterfaceService, VoiceInterfaceService } from './voice-interface';

// Location Services
export { googlePlacesService, GooglePlacesService } from './google-places-service';
export { usdaService, USDAService } from './usda-service';
export { locationService, LocationService } from './location-service';

// Search and Research Services
// Tavily integration temporarily removed due to compilation issues

/**
 * API Health Check Service
 * Provides unified health checking for all external APIs
 */
export class APIHealthService {
  /**
   * Check health of all external APIs
   */
  static async checkAllAPIs(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: 'up' | 'down' | 'degraded'; responseTime?: number; error?: string }>;
  }> {
    const services: Record<string, { status: 'up' | 'down' | 'degraded'; responseTime?: number; error?: string }> = {};
    
    // For now, return a basic health check
    // TODO: Implement actual health checks for each service
    services.placeholder = { status: 'up' };

    return {
      status: 'healthy',
      services,
    };
  }

  /**
   * Get usage statistics for all APIs
   */
  static getAllUsageStats(): Record<string, { requestCount: number; limit: number; remaining: number }> {
    // TODO: Implement actual usage stats
    return {};
  }
}

/**
 * API Configuration Validator
 * Validates that all required API keys are configured
 */
export class APIConfigValidator {
  /**
   * Validate all API configurations
   */
  static validateConfigurations(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    const requiredVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID', 
      'AWS_SECRET_ACCESS_KEY',
      'KROGER_CLIENT_ID',
      'KROGER_CLIENT_SECRET',
      'SPOONACULAR_API_KEY',
      'ELEVENLABS_API_KEY',
      'GOOGLE_PLACES_API_KEY',
      // 'TAVILY_API_KEY',
    ];

    const optionalVars = [
      'USDA_NUTRITION_API_KEY',
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Optional API key ${varName} not configured - some features may be limited`);
      }
    });

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }
}

/**
 * Convenience functions for common operations
 * TODO: Implement these functions once all services are properly integrated
 */