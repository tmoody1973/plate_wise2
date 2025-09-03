// Emergency profile creation script
// Run this in your browser console to create a basic profile and fix the issue

async function createBasicProfile() {
  console.log('🔧 Creating basic profile to fix setup issue...');
  
  try {
    // Import Supabase client
    const { createClient } = await import('/src/lib/supabase/client.js');
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return;
    }
    
    console.log('✅ User found:', user.id);
    
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (existing) {
      console.log('✅ Profile already exists');
      return;
    }
    
    // Create basic profile
    const basicProfile = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      location: {
        zipCode: '12345',
        city: 'City',
        state: 'State'
      },
      preferences: {
        languages: ['English'],
        primaryLanguage: 'English',
        culturalCuisines: ['American'],
        dietaryRestrictions: [],
        allergies: [],
        dislikes: [],
        culturalBackground: ['American'],
        traditionalCookingMethods: [],
        religiousRestrictions: []
      },
      budget_settings: {
        monthlyLimit: 500,
        householdSize: 2,
        shoppingFrequency: 'weekly',
        priorityCategories: ['produce', 'protein']
      },
      nutritional_goals: {
        calorieTarget: 2000,
        macroTargets: {
          protein: 150,
          carbs: 250,
          fat: 65
        },
        healthGoals: ['maintain_weight'],
        activityLevel: 'moderate'
      },
      cooking_profile: {
        skillLevel: 'intermediate',
        availableTime: 60,
        equipment: ['stove', 'oven'],
        mealPrepPreference: 'daily',
        cookingFrequency: 'daily'
      }
    };
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(basicProfile)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create profile:', error);
      return;
    }
    
    console.log('✅ Basic profile created successfully!');
    console.log('🎉 You can now save recipes and use the app normally');
    console.log('💡 You can update your profile later in Settings');
    
    // Clear any setup state
    localStorage.removeItem('platewise-setup-step');
    localStorage.removeItem('platewise-setup-in-progress');
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
    
  } catch (error) {
    console.error('❌ Error creating profile:', error);
  }
}

// Run the fix
createBasicProfile();
