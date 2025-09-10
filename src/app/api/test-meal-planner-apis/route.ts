import { NextRequest, NextResponse } from 'next/server';

/**
 * API Testing Endpoint for Meal Planner APIs
 * Tests both Perplexity (recipe generation) and Kroger (pricing) integrations
 */
export async function GET(request: NextRequest) {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // Test 1: Perplexity Recipe Generation
  try {
    console.log('🧪 Testing Perplexity API...');
    
    const recipeResponse = await fetch(`${request.nextUrl.origin}/api/meal-plans/recipes-only`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        culturalCuisines: ['mexican'],
        dietaryRestrictions: [],
        householdSize: 4,
        timeFrame: 'week'
      })
    });

    const recipeData = await recipeResponse.json();
    
    testResults.tests.push({
      name: 'Perplexity Recipe Generation',
      status: recipeData.success ? 'PASS' : 'FAIL',
      details: {
        recipesGenerated: recipeData.data?.recipes?.length || 0,
        responseTime: 'N/A',
        error: recipeData.success ? null : recipeData.error
      }
    });

    if (recipeData.success) {
      testResults.summary.passed++;
      
      // Test 2: Kroger Pricing (only if recipes were generated)
      if (recipeData.data?.recipes?.length > 0) {
        try {
          console.log('🧪 Testing Kroger API...');
          
          const pricingResponse = await fetch(`${request.nextUrl.origin}/api/meal-plans/add-pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipes: recipeData.data.recipes.slice(0, 1), // Test with just 1 recipe
              zipCode: '90210'
            })
          });

          const pricingData = await pricingResponse.json();
          
          testResults.tests.push({
            name: 'Kroger Pricing Integration',
            status: pricingData.success ? 'PASS' : 'FAIL',
            details: {
              recipesWithPricing: pricingData.data?.recipes?.filter((r: any) => r.hasPricing)?.length || 0,
              totalRecipes: pricingData.data?.recipes?.length || 0,
              error: pricingData.success ? null : pricingData.error
            }
          });

          if (pricingData.success) {
            testResults.summary.passed++;
          } else {
            testResults.summary.failed++;
          }
        } catch (error) {
          testResults.tests.push({
            name: 'Kroger Pricing Integration',
            status: 'FAIL',
            details: {
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
          testResults.summary.failed++;
        }
      } else {
        testResults.tests.push({
          name: 'Kroger Pricing Integration',
          status: 'SKIP',
          details: {
            reason: 'No recipes generated to test pricing with'
          }
        });
      }
    } else {
      testResults.summary.failed++;
      
      // Skip Kroger test if Perplexity failed
      testResults.tests.push({
        name: 'Kroger Pricing Integration',
        status: 'SKIP',
        details: {
          reason: 'Perplexity API failed, cannot test pricing'
        }
      });
    }
  } catch (error) {
    testResults.tests.push({
      name: 'Perplexity Recipe Generation',
      status: 'FAIL',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    testResults.summary.failed++;
  }

  testResults.summary.total = testResults.tests.length;

  // Test 3: Environment Variables Check
  const envCheck = {
    name: 'Environment Variables',
    status: 'PASS' as 'PASS' | 'FAIL',
    details: {
      perplexityApiKey: !!process.env.PERPLEXITY_API_KEY,
      krogerApiKey: !!process.env.KROGER_API_KEY,
      krogerClientId: !!process.env.KROGER_CLIENT_ID,
      rapidApiKey: !!process.env.NEXT_PUBLIC_RAPIDAPI_KEY
    }
  };

  // Check if any required env vars are missing
  const missingEnvVars = [];
  if (!process.env.PERPLEXITY_API_KEY) missingEnvVars.push('PERPLEXITY_API_KEY');
  if (!process.env.KROGER_API_KEY) missingEnvVars.push('KROGER_API_KEY');
  if (!process.env.NEXT_PUBLIC_RAPIDAPI_KEY) missingEnvVars.push('NEXT_PUBLIC_RAPIDAPI_KEY');

  if (missingEnvVars.length > 0) {
    envCheck.status = 'FAIL';
    envCheck.details = {
      ...envCheck.details,
      missingVars: missingEnvVars
    };
    testResults.summary.failed++;
  } else {
    testResults.summary.passed++;
  }

  testResults.tests.push(envCheck);
  testResults.summary.total++;

  return NextResponse.json(testResults, {
    status: testResults.summary.failed > 0 ? 500 : 200
  });
}

/**
 * POST endpoint for manual testing with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      testPerplexity = true,
      testKroger = true,
      culturalCuisines = ['mexican'],
      zipCode = '90210'
    } = body;

    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    if (testPerplexity) {
      // Custom Perplexity test
      const recipeResponse = await fetch(`${request.nextUrl.origin}/api/meal-plans/recipes-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          culturalCuisines,
          dietaryRestrictions: [],
          householdSize: 4,
          timeFrame: 'week'
        })
      });

      const recipeData = await recipeResponse.json();
      results.tests.push({
        name: 'Custom Perplexity Test',
        status: recipeData.success ? 'PASS' : 'FAIL',
        input: { culturalCuisines },
        output: recipeData
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}