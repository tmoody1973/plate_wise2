import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Testing if Perplexity actually searches the web...');
    
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Perplexity API key not configured'
      });
    }

    // Test 1: Ask Perplexity to find SPECIFIC existing recipes
    const test1Prompt = `Find the EXACT URL for this specific recipe that I know exists:
    
    "Chicken Soft Tacos" recipe on AllRecipes.com
    
    This recipe definitely exists and has been published. Please search the web and return the actual URL where this recipe can be found.
    
    Do NOT generate or construct a URL - find the real one that exists on the web.`;

    console.log('📤 TEST 1: Asking for a specific recipe we know exists...');
    
    const test1Response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Use the web-search model
        messages: [
          {
            role: 'user',
            content: test1Prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for factual responses
        return_citations: true
      })
    });

    const test1Data = await test1Response.json();
    const test1Content = test1Data.choices?.[0]?.message?.content || '';
    const test1Citations = test1Data.citations || [];

    console.log('📥 TEST 1 Results:');
    console.log('Content:', test1Content);
    console.log('Citations:', test1Citations);

    // Test 2: Ask for multiple recipes and see if URLs are real
    const test2Prompt = `Search the web and find 2 real chicken taco recipes from AllRecipes.com.
    
    Return the actual URLs you find, not generated ones.
    
    Format as:
    1. Recipe Title - URL
    2. Recipe Title - URL`;

    console.log('📤 TEST 2: Asking for multiple real recipes...');
    
    const test2Response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: test2Prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
        return_citations: true
      })
    });

    const test2Data = await test2Response.json();
    const test2Content = test2Data.choices?.[0]?.message?.content || '';
    const test2Citations = test2Data.citations || [];

    console.log('📥 TEST 2 Results:');
    console.log('Content:', test2Content);
    console.log('Citations:', test2Citations);

    // Extract URLs from both tests
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const test1Urls = test1Content.match(urlRegex) || [];
    const test2Urls = test2Content.match(urlRegex) || [];

    // Test if the URLs actually work
    const urlTests = [];
    const allUrls = [...test1Urls, ...test2Urls];

    for (const url of allUrls) {
      try {
        console.log(`🔍 Testing URL: ${url}`);
        
        const urlTest = await fetch(url, { 
          method: 'HEAD',
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)'
          }
        });
        
        urlTests.push({
          url,
          status: urlTest.status,
          works: urlTest.ok,
          statusText: urlTest.statusText
        });
        
        console.log(`${urlTest.ok ? '✅' : '❌'} ${url} - ${urlTest.status}`);
        
      } catch (error) {
        urlTests.push({
          url,
          status: 'ERROR',
          works: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.log(`❌ ${url} - ERROR: ${error}`);
      }
    }

    const workingUrls = urlTests.filter(test => test.works).length;
    const totalUrls = urlTests.length;

    return NextResponse.json({
      success: true,
      hypothesis: 'Perplexity generates URLs instead of finding real ones',
      test1: {
        prompt: 'Find specific existing recipe',
        content: test1Content,
        citations: test1Citations,
        extractedUrls: test1Urls
      },
      test2: {
        prompt: 'Find multiple real recipes',
        content: test2Content,
        citations: test2Citations,
        extractedUrls: test2Urls
      },
      urlValidation: {
        tests: urlTests,
        workingUrls,
        totalUrls,
        successRate: totalUrls > 0 ? `${workingUrls}/${totalUrls}` : '0/0',
        percentWorking: totalUrls > 0 ? Math.round((workingUrls / totalUrls) * 100) : 0
      },
      conclusion: {
        perplexitySearchesWeb: test1Citations.length > 0 || test2Citations.length > 0,
        urlsActuallyWork: workingUrls > 0,
        generatesUrls: totalUrls > workingUrls,
        recommendation: workingUrls === 0 ? 'Use verified URLs instead of AI-generated ones' : 'Some URLs work, but verification needed'
      }
    });

  } catch (error) {
    console.error('❌ Web search test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}