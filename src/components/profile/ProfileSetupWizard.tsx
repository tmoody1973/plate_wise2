/**
 * Multi-step profile setup wizard for new users
 * Collects cultural preferences, dietary restrictions, budget settings, and nutritional goals
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { CulturalPreferencesStep } from './steps/CulturalPreferencesStep';
import { DietaryRestrictionsStep } from './steps/DietaryRestrictionsStep';
import { BudgetSettingsStep } from './steps/BudgetSettingsStep';
import { NutritionalGoalsStep } from './steps/NutritionalGoalsStep';
import { CookingProfileStep } from './steps/CookingProfileStep';
import { ReviewStep } from './steps/ReviewStep';


export interface ProfileSetupData {
  personalInfo: {
    name: string;
    location: {
      zipCode: string;
      city: string;
      state: string;
    };
    languages: string[];
    primaryLanguage: string;
  };
  culturalPreferences: {
    culturalCuisines: string[];
    culturalBackground: string[];
    traditionalCookingMethods: string[];
  };
  dietaryRestrictions: {
    dietaryRestrictions: string[];
    allergies: string[];
    dislikes: string[];
    religiousRestrictions: string[];
  };
  budgetSettings: {
    monthlyLimit: number;
    householdSize: number;
    shoppingFrequency: 'weekly' | 'biweekly' | 'monthly';
    priorityCategories: string[];
  };
  nutritionalGoals: {
    calorieTarget: number;
    macroTargets: {
      protein: number;
      carbs: number;
      fat: number;
    };
    healthGoals: string[];
    activityLevel: string;
  };
  cookingProfile: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    availableTime: number;
    equipment: string[];
    mealPrepPreference: boolean;
    cookingFrequency: string;
  };
}

const STEPS = [
  { id: 'personal', title: 'Personal Info', description: 'Basic information and location' },
  { id: 'cultural', title: 'Cultural Preferences', description: 'Your culinary heritage and preferences' },
  { id: 'dietary', title: 'Dietary Needs', description: 'Restrictions, allergies, and preferences' },
  { id: 'budget', title: 'Budget Settings', description: 'Monthly budget and household details' },
  { id: 'nutrition', title: 'Nutritional Goals', description: 'Health and fitness objectives' },
  { id: 'cooking', title: 'Cooking Profile', description: 'Skills, equipment, and preferences' },
  { id: 'review', title: 'Review', description: 'Confirm your profile settings' },
] as const;

type StepId = typeof STEPS[number]['id'];

interface ProfileSetupWizardProps {
  isUpdate?: boolean;
}

export function ProfileSetupWizard({ isUpdate = false }: ProfileSetupWizardProps) {
  const { user } = useAuthContext();
  const router = useRouter();
  const { addToast } = useToast();
  const { isLoading: setupCheckLoading, profile, hasCompletedSetup } = useProfileSetup();
  const [currentStep, setCurrentStep] = useState<StepId>(() => {
    // Try to restore step from localStorage
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('platewise-setup-step');
      if (savedStep && STEPS.some(step => step.id === savedStep)) {
        return savedStep as StepId;
      }
    }
    return 'personal';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasStartedSetup, setHasStartedSetup] = useState(() => {
    // Check if user has started setup based on saved step or profile data
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('platewise-setup-step');
      return savedStep !== null && savedStep !== 'personal';
    }
    return false;
  });
  const [profileData, setProfileData] = useState<ProfileSetupData>({
    personalInfo: {
      name: user?.user_metadata?.name || '',
      location: {
        zipCode: '',
        city: '',
        state: '',
      },
      languages: ['en'],
      primaryLanguage: 'en',
    },
    culturalPreferences: {
      culturalCuisines: [],
      culturalBackground: [],
      traditionalCookingMethods: [],
    },
    dietaryRestrictions: {
      dietaryRestrictions: [],
      allergies: [],
      dislikes: [],
      religiousRestrictions: [],
    },
    budgetSettings: {
      monthlyLimit: 400,
      householdSize: 2,
      shoppingFrequency: 'weekly',
      priorityCategories: [],
    },
    nutritionalGoals: {
      calorieTarget: 2000,
      macroTargets: {
        protein: 25,
        carbs: 50,
        fat: 25,
      },
      healthGoals: [],
      activityLevel: 'moderate',
    },
    cookingProfile: {
      skillLevel: 'intermediate',
      availableTime: 30,
      equipment: [],
      mealPrepPreference: false,
      cookingFrequency: 'daily',
    },
  });

  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Initialize setup flags on mount
  useEffect(() => {
    if (!isUpdate) {
      localStorage.setItem('platewise-setup-in-progress', 'true');
    }
    
    // Cleanup function to remove flags if component unmounts unexpectedly
    return () => {
      // Only clean up if we're not navigating to dashboard (successful completion)
      if (!window.location.pathname.includes('/dashboard')) {
        localStorage.removeItem('platewise-setup-step');
        localStorage.removeItem('platewise-setup-in-progress');
      }
    };
  }, [isUpdate]);

  // Debug logging
  useEffect(() => {
    console.log('ProfileSetupWizard: Component mounted/updated', {
      currentStep,
      hasCompletedSetup,
      hasStartedSetup,
      isUpdate,
      setupCheckLoading,
      isLoadingProfile
    });
  }, [currentStep, hasCompletedSetup, hasStartedSetup, isUpdate, setupCheckLoading, isLoadingProfile]);

  const updateProfileData = (stepData: Partial<ProfileSetupData>) => {
    console.log('ProfileSetupWizard: Updating profile data', stepData);
    setProfileData(prev => {
      const updated = { ...prev, ...stepData };
      console.log('ProfileSetupWizard: New profile data', updated);
      return updated;
    });
  };

  // Load existing profile data when in update mode
  useEffect(() => {
    if (isUpdate && profile && !isLoadingProfile) {
      setIsLoadingProfile(true);
      
      // Transform profile data to setup data format
      const existingData: ProfileSetupData = {
        personalInfo: {
          name: profile.name,
          location: profile.location,
          languages: profile.preferences.languages,
          primaryLanguage: profile.preferences.primaryLanguage,
        },
        culturalPreferences: {
          culturalCuisines: profile.preferences.culturalCuisines || [],
          culturalBackground: (profile.preferences as any).culturalBackground || [],
          traditionalCookingMethods: (profile.preferences as any).traditionalCookingMethods || [],
        },
        dietaryRestrictions: {
          dietaryRestrictions: profile.preferences.dietaryRestrictions,
          allergies: profile.preferences.allergies,
          dislikes: profile.preferences.dislikes,
          religiousRestrictions: (profile.preferences as any).religiousRestrictions || [],
        },
        budgetSettings: {
          monthlyLimit: profile.budget.monthlyLimit,
          householdSize: profile.budget.householdSize,
          shoppingFrequency: profile.budget.shoppingFrequency,
          priorityCategories: (profile.budget as any).priorityCategories || [],
        },
        nutritionalGoals: {
          calorieTarget: profile.nutritionalGoals.calorieTarget,
          macroTargets: profile.nutritionalGoals.macroTargets,
          healthGoals: profile.nutritionalGoals.healthGoals,
          activityLevel: profile.nutritionalGoals.activityLevel,
        },
        cookingProfile: {
          skillLevel: profile.cookingProfile.skillLevel,
          availableTime: profile.cookingProfile.availableTime,
          equipment: profile.cookingProfile.equipment,
          mealPrepPreference: profile.cookingProfile.mealPrepPreference,
          cookingFrequency: (profile.cookingProfile as any).cookingFrequency || 'daily',
        },
      };

      setProfileData(existingData);
      setIsLoadingProfile(false);
    }
  }, [isUpdate, profile, isLoadingProfile]);

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'personal':
        return !!(
          profileData.personalInfo.name.trim() &&
          profileData.personalInfo.location.zipCode &&
          profileData.personalInfo.location.city &&
          profileData.personalInfo.location.state &&
          profileData.personalInfo.languages.length > 0
        );
      case 'cultural':
        // Cultural preferences are optional, so always valid
        return true;
      case 'dietary':
        // Dietary restrictions are optional, so always valid
        return true;
      case 'budget':
        return !!(
          profileData.budgetSettings.monthlyLimit > 0 &&
          profileData.budgetSettings.householdSize > 0
        );
      case 'nutrition':
        return !!(
          profileData.nutritionalGoals.calorieTarget > 0 &&
          profileData.nutritionalGoals.activityLevel
        );
      case 'cooking':
        return !!(
          profileData.cookingProfile.skillLevel &&
          profileData.cookingProfile.availableTime > 0 &&
          profileData.cookingProfile.cookingFrequency
        );
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      addToast({
        type: 'warning',
        title: 'Required Fields Missing',
        message: 'Please fill in all required fields before continuing.',
      });
      return;
    }

    // Mark that user has started the setup process
    if (!hasStartedSetup) {
      setHasStartedSetup(true);
      // Set a flag to indicate setup is in progress
      localStorage.setItem('platewise-setup-in-progress', 'true');
    }

    if (!isLastStep && currentStepIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep) {
        setCurrentStep(nextStep.id);
        // Save step to localStorage
        localStorage.setItem('platewise-setup-step', nextStep.id);
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep && currentStepIndex > 0) {
      const prevStep = STEPS[currentStepIndex - 1];
      if (prevStep) {
        setCurrentStep(prevStep.id);
        // Save step to localStorage
        localStorage.setItem('platewise-setup-step', prevStep.id);
      }
    }
  };

  const handleComplete = async () => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Authentication Error',
        message: 'Please sign in to complete your profile setup.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { profileService } = await import('@/lib/profile/profile-service');
      const result = await profileService.saveProfileSetupData(user.id, profileData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile');
      }
      
      addToast({
        type: 'success',
        title: isUpdate ? 'Profile Updated!' : 'Profile Setup Complete!',
        message: isUpdate 
          ? 'Your PlateWise profile has been updated successfully.'
          : 'Your PlateWise profile has been created successfully.',
      });
      
      // Clear setup flags from localStorage
      localStorage.removeItem('platewise-setup-step');
      localStorage.removeItem('platewise-setup-in-progress');
      
      // Small delay to show success message before redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast({
        type: 'error',
        title: 'Setup Failed',
        message: error instanceof Error ? error.message : 'Failed to save profile. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <PersonalInfoStep
            data={profileData.personalInfo}
            onUpdate={(data) => updateProfileData({ personalInfo: data })}
          />
        );
      case 'cultural':
        return (
          <CulturalPreferencesStep
            data={profileData.culturalPreferences}
            onUpdate={(data) => updateProfileData({ culturalPreferences: data })}
          />
        );
      case 'dietary':
        return (
          <DietaryRestrictionsStep
            data={profileData.dietaryRestrictions}
            onUpdate={(data) => updateProfileData({ dietaryRestrictions: data })}
          />
        );
      case 'budget':
        return (
          <BudgetSettingsStep
            data={profileData.budgetSettings}
            onUpdate={(data) => updateProfileData({ budgetSettings: data })}
          />
        );
      case 'nutrition':
        return (
          <NutritionalGoalsStep
            data={profileData.nutritionalGoals}
            onUpdate={(data) => updateProfileData({ nutritionalGoals: data })}
          />
        );
      case 'cooking':
        return (
          <CookingProfileStep
            data={profileData.cookingProfile}
            onUpdate={(data) => updateProfileData({ cookingProfile: data })}
          />
        );
      case 'review':
        return (
          <ReviewStep
            data={profileData}
            onUpdate={updateProfileData}
          />
        );
      default:
        return null;
    }
  };

  // Show loading while checking setup status or loading profile data
  if (setupCheckLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoadingProfile ? 'Loading your profile...' : 'Checking profile status...'}
          </p>
        </div>
      </div>
    );
  }

  // Only redirect if setup is complete and user hasn't started the setup process
  // This prevents redirects during the setup process
  if (!isUpdate && hasCompletedSetup && !hasStartedSetup) {
    router.push('/dashboard');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isUpdate ? 'Update Your Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-600">
            {isUpdate 
              ? 'Update your preferences to get better personalized recommendations'
              : 'Help us personalize your PlateWise experience with culturally-aware meal planning'
            }
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {STEPS[currentStepIndex]?.title || 'Setup Step'}
            </h2>
            <p className="text-gray-600">{STEPS[currentStepIndex]?.description || 'Complete your profile'}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handlePrevious}
            disabled={isFirstStep}
            variant="outline"
            className="px-6"
          >
            Previous
          </Button>
          
          {isLastStep ? (
            <Button
              onClick={() => void handleComplete()}
              disabled={isLoading}
              className="px-8 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isUpdate ? 'Updating Profile...' : 'Completing Setup...'}</span>
                </div>
              ) : (
                isUpdate ? 'Update Profile' : 'Complete Setup'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!validateCurrentStep()}
              className="px-6"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}