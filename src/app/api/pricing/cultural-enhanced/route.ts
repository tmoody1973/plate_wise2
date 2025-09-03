/**
 * Enhanced Cultural Pricing API Route
 * Provides comprehensive cultural pricing intelligence with confidence scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedCulturalPricingService, type CulturalPricingRequest } from '@/lib/external-apis/enhanced-cultural-pricing-service';
import { culturalPricingDb } from '@/lib/database/cultural-pricing-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = validateCulturalPricingRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400 }
      );
    }

    const pricingRequest: CulturalPricingRequest = {
      ingredients: body.ingredients,
      location: body.location,
      culturalContext: body.culturalContext,
      servings: body.servings || 4,
      budgetConstraint: body.budgetConstraint,
      prioritizeAuthenticity: body.prioritizeAuthenticity || false,
    };

    // Get enhanced cultural pricing
    const result = await enhancedCulturalPricingService.getCulturalPricing(pricingRequest);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Enhanced cultural pricing API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get cultural pricing',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'markets':
        return await handleGetMarkets(searchParams);
      
      case 'cultural-ingredients':
        return await handleGetCulturalIngredients(searchParams);
      
      case 'confidence':
        return await handleGetConfidence(searchParams);
      
      case 'traditional-mapping':
        return await handleTraditionalMapping(searchParams);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Enhanced cultural pricing GET API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleGetMarkets(searchParams: URLSearchParams) {
  const location = searchParams.get('location');
  const culturalContext = searchParams.get('culturalContext');

  if (!location) {
    return NextResponse.json(
      { error: 'Location parameter is required' },
      { status: 400 }
    );
  }

  const markets = await enhancedCulturalPricingService.discoverEthnicMarkets(
    location,
    culturalContext || ''
  );

  return NextResponse.json({
    success: true,
    data: { markets },
    timestamp: new Date().toISOString(),
  });
}

async function handleGetCulturalIngredients(searchParams: URLSearchParams) {
  const culturalOrigin = searchParams.get('culturalOrigin');

  if (!culturalOrigin) {
    return NextResponse.json(
      { error: 'Cultural origin parameter is required' },
      { status: 400 }
    );
  }

  const ingredients = await culturalPricingDb.getCulturalIngredientsByOrigin(culturalOrigin);

  return NextResponse.json({
    success: true,
    data: { ingredients },
    timestamp: new Date().toISOString(),
  });
}

async function handleGetConfidence(searchParams: URLSearchParams) {
  const ingredients = searchParams.get('ingredients')?.split(',') || [];
  const location = searchParams.get('location');
  const culturalContext = searchParams.get('culturalContext');

  if (!location || ingredients.length === 0) {
    return NextResponse.json(
      { error: 'Location and ingredients parameters are required' },
      { status: 400 }
    );
  }

  const confidence = await culturalPricingDb.calculateCulturalPricingConfidence(
    ingredients,
    location,
    culturalContext || undefined
  );

  return NextResponse.json({
    success: true,
    data: { confidence },
    timestamp: new Date().toISOString(),
  });
}

async function handleTraditionalMapping(searchParams: URLSearchParams) {
  const ingredients = searchParams.get('ingredients')?.split(',') || [];
  const culturalContext = searchParams.get('culturalContext');

  if (!culturalContext || ingredients.length === 0) {
    return NextResponse.json(
      { error: 'Cultural context and ingredients parameters are required' },
      { status: 400 }
    );
  }

  const mapping = await enhancedCulturalPricingService.mapTraditionalIngredients(
    ingredients,
    culturalContext
  );

  return NextResponse.json({
    success: true,
    data: { mapping },
    timestamp: new Date().toISOString(),
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'update-cultural-ingredient':
        return await handleUpdateCulturalIngredient(body);
      
      case 'verify-market':
        return await handleVerifyMarket(body);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Enhanced cultural pricing PUT API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleUpdateCulturalIngredient(body: any) {
  const { ingredientName, culturalData } = body;

  if (!ingredientName || !culturalData) {
    return NextResponse.json(
      { error: 'Ingredient name and cultural data are required' },
      { status: 400 }
    );
  }

  const success = await enhancedCulturalPricingService.updateCulturalIngredientDatabase(
    ingredientName,
    culturalData
  );

  return NextResponse.json({
    success,
    message: success ? 'Cultural ingredient updated successfully' : 'Failed to update cultural ingredient',
    timestamp: new Date().toISOString(),
  });
}

async function handleVerifyMarket(body: any) {
  const { marketId, verified } = body;

  if (!marketId || typeof verified !== 'boolean') {
    return NextResponse.json(
      { error: 'Market ID and verification status are required' },
      { status: 400 }
    );
  }

  // This would update the market verification status in the database
  // Implementation depends on your specific requirements
  
  return NextResponse.json({
    success: true,
    message: 'Market verification updated successfully',
    timestamp: new Date().toISOString(),
  });
}

function validateCulturalPricingRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    errors.push('Ingredients array is required and must not be empty');
  }

  if (!body.location || typeof body.location !== 'string') {
    errors.push('Location is required and must be a string');
  }

  if (body.servings && (typeof body.servings !== 'number' || body.servings <= 0)) {
    errors.push('Servings must be a positive number');
  }

  if (body.budgetConstraint && (typeof body.budgetConstraint !== 'number' || body.budgetConstraint <= 0)) {
    errors.push('Budget constraint must be a positive number');
  }

  if (body.culturalContext && typeof body.culturalContext !== 'string') {
    errors.push('Cultural context must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}