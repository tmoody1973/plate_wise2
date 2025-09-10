import { NextRequest, NextResponse } from 'next/server';

interface APIUsageStats {
  endpoint: string;
  count: number;
  lastUsed: Date;
  estimatedCost: number;
}

// In-memory usage tracking (in production, use Redis or database)
const usageStats = new Map<string, APIUsageStats>();

// Google Places API pricing (as of 2024)
const PRICING = {
  'place/textsearch': 0.032,      // $32 per 1000 requests
  'place/nearbysearch': 0.032,    // $32 per 1000 requests  
  'place/details': 0.017,         // $17 per 1000 requests
  'place/findplacefromtext': 0.032, // $32 per 1000 requests
  'geocode': 0.005,               // $5 per 1000 requests
  'place/autocomplete': 0.00283,  // $2.83 per 1000 requests (session-based)
  'place/photo': 0.007            // $7 per 1000 requests
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const reset = searchParams.get('reset');

    if (reset === 'true') {
      usageStats.clear();
      return NextResponse.json({
        success: true,
        message: 'Usage statistics reset'
      });
    }

    if (action === 'summary') {
      const stats = Array.from(usageStats.values());
      const totalCost = stats.reduce((sum, stat) => sum + stat.estimatedCost, 0);
      const totalRequests = stats.reduce((sum, stat) => sum + stat.count, 0);

      return NextResponse.json({
        summary: {
          totalRequests,
          totalEstimatedCost: totalCost,
          totalCostFormatted: `$${totalCost.toFixed(4)}`,
          endpointCount: stats.length,
          mostExpensive: stats.sort((a, b) => b.estimatedCost - a.estimatedCost)[0],
          mostUsed: stats.sort((a, b) => b.count - a.count)[0]
        },
        endpoints: stats.map(stat => ({
          ...stat,
          costFormatted: `$${stat.estimatedCost.toFixed(4)}`,
          lastUsedFormatted: stat.lastUsed.toLocaleString()
        })),
        pricing: PRICING,
        recommendations: generateRecommendations(stats, totalCost)
      });
    }

    // Default: return current usage
    const stats = Array.from(usageStats.entries()).map(([endpoint, data]) => ({
      endpoint,
      ...data,
      costFormatted: `$${data.estimatedCost.toFixed(4)}`,
      lastUsedFormatted: data.lastUsed.toLocaleString()
    }));

    return NextResponse.json({
      usage: stats,
      totalCost: stats.reduce((sum, stat) => sum + stat.estimatedCost, 0),
      apiKeyConfigured: !!process.env.GOOGLE_PLACES_API_KEY,
      keyLength: process.env.GOOGLE_PLACES_API_KEY?.length || 0
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { endpoint, cost } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    // Update usage stats
    const existing = usageStats.get(endpoint);
    const estimatedCost = cost || PRICING[endpoint as keyof typeof PRICING] || 0.01;

    usageStats.set(endpoint, {
      endpoint,
      count: (existing?.count || 0) + 1,
      lastUsed: new Date(),
      estimatedCost: (existing?.estimatedCost || 0) + estimatedCost
    });

    return NextResponse.json({
      success: true,
      message: `Logged usage for ${endpoint}`,
      newTotal: usageStats.get(endpoint)
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(stats: APIUsageStats[], totalCost: number): string[] {
  const recommendations: string[] = [];

  if (totalCost > 10) {
    recommendations.push('⚠️ High API costs detected! Consider implementing caching or rate limiting.');
  }

  const textSearchUsage = stats.find(s => s.endpoint.includes('textsearch'));
  if (textSearchUsage && textSearchUsage.count > 100) {
    recommendations.push('💡 High text search usage. Consider using Place IDs for repeat lookups.');
  }

  const detailsUsage = stats.find(s => s.endpoint.includes('details'));
  if (detailsUsage && detailsUsage.count > 200) {
    recommendations.push('💡 High details API usage. Cache place details for 24+ hours.');
  }

  if (stats.length > 5) {
    recommendations.push('🔧 Multiple endpoints in use. Consider consolidating API calls.');
  }

  if (totalCost > 1 && totalCost < 10) {
    recommendations.push('✅ Moderate usage detected. Monitor daily to avoid surprises.');
  }

  if (totalCost < 1) {
    recommendations.push('✅ Low usage detected. Current usage is cost-effective.');
  }

  return recommendations;
}