import { NextRequest, NextResponse } from 'next/server';

interface APIStatus {
  name: string;
  status: 'working' | 'error' | 'not_configured';
  message: string;
  details?: any;
}

export async function GET(request: NextRequest) {
  const results: APIStatus[] = [];

  // Test Perplexity API
  try {
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityKey) {
      results.push({
        name: 'Perplexity AI',
        status: 'not_configured',
        message: 'API key not found'
      });
    } else {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'Test message' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        results.push({
          name: 'Perplexity AI',
          status: 'working',
          message: 'API is responding correctly'
        });
      } else {
        const error = await response.text();
        results.push({
          name: 'Perplexity AI',
          status: 'error',
          message: `HTTP ${response.status}: ${error}`,
          details: { status: response.status, error }
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'Perplexity AI',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Note: WebScraping.AI not needed - using Perplexity for complete recipes

  // Test Kroger API
  try {
    const krogerClientId = process.env.KROGER_CLIENT_ID;
    const krogerApiKey = process.env.KROGER_API_KEY;
    
    if (!krogerClientId || !krogerApiKey) {
      results.push({
        name: 'Kroger API',
        status: 'not_configured',
        message: 'Client ID or API key not found'
      });
    } else {
      // Test OAuth token endpoint
      const credentials = Buffer.from(`${krogerClientId}:${krogerApiKey}`).toString('base64');
      
      const response = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials&scope=product.compact'
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          name: 'Kroger API',
          status: 'working',
          message: 'OAuth token obtained successfully',
          details: { tokenType: data.token_type, expiresIn: data.expires_in }
        });
      } else {
        const error = await response.text();
        results.push({
          name: 'Kroger API',
          status: 'error',
          message: `OAuth failed: HTTP ${response.status}`,
          details: { status: response.status, error }
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'Kroger API',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      results.push({
        name: 'Supabase',
        status: 'not_configured',
        message: 'URL or anon key not found'
      });
    } else {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (response.ok) {
        results.push({
          name: 'Supabase',
          status: 'working',
          message: 'Database connection successful'
        });
      } else {
        results.push({
          name: 'Supabase',
          status: 'error',
          message: `HTTP ${response.status}: Connection failed`
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'Supabase',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test OpenAI (if configured)
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      results.push({
        name: 'OpenAI',
        status: 'not_configured',
        message: 'API key not found'
      });
    } else {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`
        }
      });

      if (response.ok) {
        results.push({
          name: 'OpenAI',
          status: 'working',
          message: 'API is responding correctly'
        });
      } else {
        const error = await response.text();
        results.push({
          name: 'OpenAI',
          status: 'error',
          message: `HTTP ${response.status}: ${error}`
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'OpenAI',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test Spoonacular
  try {
    const spoonacularKey = process.env.SPOONACULAR_API_KEY;
    if (!spoonacularKey) {
      results.push({
        name: 'Spoonacular',
        status: 'not_configured',
        message: 'API key not found'
      });
    } else {
      const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=pasta&number=1&apiKey=${spoonacularKey}`);

      if (response.ok) {
        results.push({
          name: 'Spoonacular',
          status: 'working',
          message: 'API is responding correctly'
        });
      } else {
        const error = await response.text();
        results.push({
          name: 'Spoonacular',
          status: 'error',
          message: `HTTP ${response.status}: ${error}`
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'Spoonacular',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Summary
  const workingCount = results.filter(r => r.status === 'working').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const notConfiguredCount = results.filter(r => r.status === 'not_configured').length;

  return NextResponse.json({
    summary: {
      total: results.length,
      working: workingCount,
      errors: errorCount,
      notConfigured: notConfiguredCount,
      overallStatus: workingCount > 0 ? 'partial' : errorCount > 0 ? 'errors' : 'none_configured'
    },
    apis: results,
    timestamp: new Date().toISOString(),
    recommendations: generateRecommendations(results)
  });
}

function generateRecommendations(results: APIStatus[]): string[] {
  const recommendations: string[] = [];
  
  const errorApis = results.filter(r => r.status === 'error');
  const notConfiguredApis = results.filter(r => r.status === 'not_configured');
  
  if (errorApis.length > 0) {
    recommendations.push(`${errorApis.length} APIs have errors and need attention: ${errorApis.map(a => a.name).join(', ')}`);
  }
  
  if (notConfiguredApis.length > 0) {
    recommendations.push(`${notConfiguredApis.length} APIs are not configured: ${notConfiguredApis.map(a => a.name).join(', ')}`);
  }
  
  // Specific recommendations
  const perplexityError = results.find(r => r.name === 'Perplexity AI' && r.status === 'error');
  if (perplexityError) {
    recommendations.push('Perplexity API issues may be due to rate limiting or invalid key. Use offline mode for reliable service.');
  }
  
  const krogerError = results.find(r => r.name === 'Kroger API' && r.status === 'error');
  if (krogerError) {
    recommendations.push('Kroger API issues detected. Enable mock mode with NEXT_PUBLIC_KROGER_MOCK=true for development.');
  }
  
  const workingApis = results.filter(r => r.status === 'working');
  if (workingApis.length > 0) {
    recommendations.push(`Working APIs: ${workingApis.map(a => a.name).join(', ')}. Focus on using these for now.`);
  }
  
  return recommendations;
}