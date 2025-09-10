import { NextRequest, NextResponse } from 'next/server';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredient = searchParams.get('ingredient') || 'tomatoes';
    const zipCode = searchParams.get('zipCode') || '90210';

    console.log(`Testing Kroger API with ingredient: ${ingredient}, zipCode: ${zipCode}`);

    const krogerService = new KrogerPricingService();
    
    // Test single ingredient pricing
    const result = await krogerService.getIngredientPrice(ingredient, zipCode);

    return NextResponse.json({
      success: true,
      ingredient,
      zipCode,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Kroger single test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}