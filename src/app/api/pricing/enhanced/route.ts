/**
 * Enhanced Pricing API Route with Perplexity Fallback
 * GET /api/pricing/enhanced
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedPricingService } from '@/lib/external-apis/enhanced-pricing-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients, location, storeId } = body;

    // Validate required fields
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredients array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!location || typeof location !== 'string') {
      return NextResponse.json(
        { error: 'Location is required (zip code or city, state)' },
        { status: 400 }
      );
    }

    console.log(`Enhanced pricing request: ${ingredients.length} ingredients in ${location}`);

    // Get pricing using enhanced service with fallback
    const pricingResponse = await enhancedPricingService.getIngredientPricing({
      ingredients,
      location,
      storeId
    });

    // Log the results for debugging
    console.log(`Pricing completed: ${pricingResponse.results.length} results, ${pricingResponse.fallbacksUsed} fallbacks used`);
    
    if (pricingResponse.errors.length > 0) {
      console.warn('Pricing errors:', pricingResponse.errors);
    }

    return NextResponse.json({
      success: true,
      data: pricingResponse,
      meta: {
        requestedIngredients: ingredients.length,
        resultsReturned: pricingResponse.results.length,
        fallbacksUsed: pricingResponse.fallbacksUsed,
        primarySource: pricingResponse.primarySource,
        averageConfidence: Math.round(pricingResponse.averageConfidence * 100) / 100,
        totalCost: Math.round(pricingResponse.totalEstimatedCost * 100) / 100
      }
    });

  } catch (error) {
    console.error('Enhanced pricing API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get ingredient pricing',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackAvailable: true
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    const healthStatus = await enhancedPricingService.healthCheck();
    
    return NextResponse.json({
      success: true,
      status: 'Enhanced Pricing Service',
      health: healthStatus,
      services: {
        kroger: healthStatus.kroger ? 'Available' : 'Unavailable',
        perplexity: healthStatus.perplexity ? 'Available' : 'Unavailable',
        fallback: 'Always Available'
      },
      message: healthStatus.overall 
        ? 'At least one pricing service is available'
        : 'Using basic estimates only'
    });

  } catch (error) {
    console.error('Enhanced pricing health check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}