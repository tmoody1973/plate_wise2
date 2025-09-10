// Test script to debug the Perplexity response
const testDebugResponse = async () => {
  try {
    console.log('🧪 Testing Perplexity response debugging...');
    const response = await fetch('http://localhost:3006/api/debug/enhanced-recipe-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'mexican recipes',
        culturalCuisine: 'mexican',
        maxResults: 3
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Debug response received');
    console.log('📝 Raw content preview:', data.rawContent?.substring(0, 500));
    console.log('📝 Search results count:', data.searchResults?.length || 0);
    console.log('📝 Search results:', data.searchResults?.map(r => ({ title: r.title, url: r.url })));
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Run the test
testDebugResponse();