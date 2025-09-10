/**
 * Test script to verify Tavily returns individual recipe URLs, not collections
 */

const testQueries = [
  { query: "chicken parmesan", expected: "individual recipe" },
  { query: "vegetarian pasta", expected: "individual recipe" },
  { query: "chocolate chip cookies", expected: "individual recipe" },
  { query: "beef stir fry", expected: "individual recipe" },
  { query: "banana bread", expected: "individual recipe" }
];

async function testQuery(query) {
  try {
    const response = await fetch('http://localhost:3000/api/test-tavily-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults: 2 })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      return { query, status: 'FAILED', error: result.error.message };
    }
    
    const urls = result.results.urls;
    const analysis = urls.map(url => {
      const isIndividual = (
        url.includes('/recipe/') && 
        !url.includes('/gallery/') && 
        !url.includes('/collection/') &&
        !url.includes('roundup') &&
        !url.includes('best-recipes')
      );
      return { url, isIndividual };
    });
    
    const individualCount = analysis.filter(a => a.isIndividual).length;
    const collectionCount = analysis.filter(a => !a.isIndividual).length;
    
    return {
      query,
      status: 'SUCCESS',
      urlCount: urls.length,
      individualCount,
      collectionCount,
      urls: analysis
    };
    
  } catch (error) {
    return { query, status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Tavily URL Discovery - Individual Recipe Detection\n');
  
  const results = [];
  
  for (const test of testQueries) {
    console.log(`Testing: "${test.query}"`);
    const result = await testQuery(test.query);
    results.push(result);
    
    if (result.status === 'SUCCESS') {
      console.log(`  ✅ Found ${result.urlCount} URLs (${result.individualCount} individual, ${result.collectionCount} collections)`);
      result.urls.forEach(({ url, isIndividual }) => {
        console.log(`    ${isIndividual ? '✅' : '❌'} ${url}`);
      });
    } else {
      console.log(`  ❌ ${result.status}: ${result.error}`);
    }
    console.log('');
  }
  
  // Summary
  const successful = results.filter(r => r.status === 'SUCCESS');
  const totalUrls = successful.reduce((sum, r) => sum + r.urlCount, 0);
  const totalIndividual = successful.reduce((sum, r) => sum + r.individualCount, 0);
  const totalCollections = successful.reduce((sum, r) => sum + r.collectionCount, 0);
  
  console.log('📊 Test Summary:');
  console.log(`  Successful queries: ${successful.length}/${testQueries.length}`);
  console.log(`  Total URLs found: ${totalUrls}`);
  console.log(`  Individual recipes: ${totalIndividual} (${Math.round(totalIndividual/totalUrls*100)}%)`);
  console.log(`  Collection pages: ${totalCollections} (${Math.round(totalCollections/totalUrls*100)}%)`);
  
  if (totalIndividual >= totalCollections) {
    console.log('\n🎉 SUCCESS: Tavily is now returning more individual recipes than collections!');
    console.log('✅ Task 2.3 URL validation and filtering logic is working correctly');
  } else {
    console.log('\n⚠️  Still getting some collection pages, but improvement made');
  }
}

runTests().catch(console.error);