import { NextRequest, NextResponse } from 'next/server';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const zipCode = searchParams.get('zipCode') || '90210';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required'
      }, { status: 400 });
    }

    console.log(`🔍 Searching Kroger for: "${query}" in ${zipCode}`);

    const krogerService = new KrogerPricingService();
    
    // Get ingredient pricing which includes alternatives
    const result = await krogerService.getIngredientPrice(query, zipCode);
    
    if (!result.bestMatch) {
      return NextResponse.json({
        success: false,
        error: 'No products found',
        timestamp: new Date().toISOString()
      });
    }

    // Format results for ingredient substitution
    const searchResults = [];
    
    // Add best match first
    if (result.bestMatch) {
      searchResults.push({
        id: result.bestMatch.productId,
        name: result.bestMatch.name,
        cleanName: result.bestMatch.name.replace(/®|™|©/g, '').trim(),
        price: result.bestMatch.price.regular,
        salePrice: result.bestMatch.price.sale || result.bestMatch.price.promo,
        onSale: !!(result.bestMatch.price.sale || result.bestMatch.price.promo),
        size: result.bestMatch.size,
        brand: result.bestMatch.brand,
        confidence: result.confidence,
        availability: result.bestMatch.availability,
        storeLocation: result.location?.name,
        isBestMatch: true
      });
    }
    
    // Add alternatives
    if (result.alternatives) {
      for (const alt of result.alternatives.slice(0, limit - 1)) {
        searchResults.push({
          id: alt.productId,
          name: alt.name,
          cleanName: alt.name.replace(/®|™|©/g, '').trim(),
          price: alt.price.regular,
          salePrice: alt.price.sale || alt.price.promo,
          onSale: !!(alt.price.sale || alt.price.promo),
          size: alt.size,
          brand: alt.brand,
          confidence: 'medium',
          availability: alt.availability,
          storeLocation: result.location?.name,
          isBestMatch: false
        });
      }
    }

    // Sort by relevance (best match first, then by price)
    searchResults.sort((a, b) => {
      if (a.isBestMatch && !b.isBestMatch) return -1;
      if (!a.isBestMatch && b.isBestMatch) return 1;
      return a.price - b.price;
    });

    return NextResponse.json({
      success: true,
      query,
      zipCode,
      results: searchResults.slice(0, limit),
      summary: {
        totalResults: searchResults.length,
        storeLocation: result.location?.name,
        averagePrice: searchResults.length > 0 
          ? searchResults.reduce((sum, item) => sum + item.price, 0) / searchResults.length 
          : 0,
        onSaleCount: searchResults.filter(item => item.onSale).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ingredient search failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}