// Test script to debug recipe saving
// Run this in your browser console on the recipes page after logging in

async function testRecipeSave() {
  console.log('🧪 Testing Recipe Save Functionality');
  console.log('=====================================');
  
  try {
    // Test 1: Check authentication
    console.log('1. Checking authentication...');
    const { createClient } = await import('/src/lib/supabase/client.js');
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test 2: Check user profile
    console.log('2. Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('⚠️  User profile not found - this is likely the issue!');
        console.log('Creating minimal profile...');
        
        // Create minimal profile
        const minimalProfile = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          location: {},
          preferences: {},
          budget_settings: {
            monthlyLimit: 500,
            householdSize: 2,
            shoppingFrequency: 'weekly'
          },
          nutritional_goals: {
            calorieTarget: 2000,
            macroTargets: { protein: 150, carbs: 250, fat: 65 },
            healthGoals: [],
            activityLevel: 'moderate'
          },
          cooking_profile: {
            skillLevel: 'intermediate',
            availableTime: 60,
            equipment: [],
            mealPrepPreference: 'daily',
            cookingFrequency: 'daily'
          }
        };

        const { error: createError } = await supabase
          .from('user_profiles')
          .insert(minimalProfile);

        if (createError) {
          console.error('❌ Failed to create profile:', createError);
          return;
        }
        
        console.log('✅ Minimal profile created');
      } else {
        console.error('❌ Profile check failed:', profileError);
        return;
      }
    } else {
      console.log('✅ User profile exists');
    }
    
    // Test 3: Try creating a test recipe
    console.log('3. Testing recipe creation...');
    const testRecipe = {
      title: 'Test Spoonacular Recipe',
      description: 'A test recipe from Spoonacular',
      cultural_origin: ['italian'],
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
          description: 'Cook the pasta according to package directions'
        }
      ],
      nutritional_info: null,
      cost_analysis: null,
      metadata: {
        servings: 2,
        prepTime: 5,
        cookTime: 10,
        totalTime: 15,
        difficulty: 'easy',
        culturalAuthenticity: 7
      },
      tags: ['test', 'italian'],
      source: 'spoonacular',
      author_id: user.id,
      is_public: false
    };

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert(testRecipe)
      .select()
      .single();

    if (recipeError) {
      console.error('❌ Recipe creation failed:', recipeError);
      
      if (recipeError.code === '23503') {
        console.log('💡 This is a foreign key constraint error - user profile issue');
      }
      
      return;
    }
    
    console.log('✅ Test recipe created successfully!', recipe.id);
    
    // Clean up - delete the test recipe
    await supabase.from('recipes').delete().eq('id', recipe.id);
    console.log('🧹 Test recipe cleaned up');
    
    console.log('🎉 All tests passed! Recipe saving should work now.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testRecipeSave();
