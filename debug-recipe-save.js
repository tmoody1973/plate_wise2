// Debug script to test recipe saving functionality
// Run this in your browser console on the recipes page

async function debugRecipeSave() {
  console.log('=== PlateWise Recipe Save Debug ===');
  
  // Check authentication
  console.log('1. Checking authentication...');
  const authContext = window.__PLATEWISE_AUTH__;
  if (!authContext) {
    console.error('❌ Auth context not found. Make sure you\'re logged in.');
    return;
  }
  
  console.log('✅ Auth context found:', authContext);
  
  // Check Supabase configuration
  console.log('2. Checking Supabase configuration...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not configured');
    console.log('Missing:', {
      url: !supabaseUrl,
      key: !supabaseKey
    });
    return;
  }
  
  console.log('✅ Supabase configured');
  
  // Check user profile
  console.log('3. Checking user profile...');
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authContext.user?.id)
      .single();
    
    if (error) {
      console.error('❌ User profile error:', error);
      if (error.code === 'PGRST116') {
        console.log('💡 User profile doesn\'t exist. This might be the issue!');
      }
      return;
    }
    
    console.log('✅ User profile found:', profile);
    
  } catch (error) {
    console.error('❌ Error checking user profile:', error);
    return;
  }
  
  // Test recipe creation
  console.log('4. Testing recipe creation...');
  const testRecipe = {
    title: 'Test Recipe from Spoonacular',
    description: 'Test description',
    culturalOrigin: ['italian'],
    cuisine: 'italian',
    ingredients: [
      {
        id: '1',
        name: 'pasta',
        amount: 1,
        unit: 'cup',
        culturalName: 'pasta',
        substitutes: [],
        costPerUnit: 0,
        availability: []
      }
    ],
    instructions: [
      {
        step: 1,
        description: 'Cook pasta'
      }
    ],
    metadata: {
      servings: 2,
      prepTime: 10,
      cookTime: 15,
      totalTime: 25,
      difficulty: 'easy',
      culturalAuthenticity: 7
    },
    tags: ['test'],
    source: 'spoonacular',
    isPublic: false
  };
  
  try {
    const { recipeService } = await import('@/lib/recipes');
    const result = await recipeService.createRecipe(testRecipe, authContext.user.id);
    
    if (result) {
      console.log('✅ Recipe created successfully:', result);
    } else {
      console.error('❌ Recipe creation returned null');
    }
    
  } catch (error) {
    console.error('❌ Recipe creation failed:', error);
  }
  
  console.log('=== Debug Complete ===');
}

// Make auth context available for debugging
if (typeof window !== 'undefined') {
  // This will be set by the auth context
  window.__PLATEWISE_DEBUG__ = debugRecipeSave;
}

console.log('Debug script loaded. Run debugRecipeSave() to test recipe saving.');
