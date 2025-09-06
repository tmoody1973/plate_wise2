/**
 * Profile Edit Form Component
 * Provides real-time profile editing with immediate updates
 * Implements requirement 9.3 for immediate application of preference changes
 */

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import type { UserProfile } from '@/types';
import { StoreSelectionCard, type StoreInfo } from '@/components/profile/StoreSelectionCard';

interface ProfileEditFormProps {
  profile: UserProfile | null;
  onUpdate: (updates: Partial<UserProfile>) => Promise<boolean>;
  onRefresh: () => void;
}

interface EditableSection {
  id: string;
  title: string;
  icon: string;
  fields: string[];
}

const editableSections: EditableSection[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    icon: '👤',
    fields: ['name', 'location'],
  },
  {
    id: 'cultural',
    title: 'Cultural Preferences',
    icon: '🌍',
    fields: ['culturalCuisines', 'languages'],
  },
  {
    id: 'dietary',
    title: 'Dietary Restrictions',
    icon: '🥗',
    fields: ['dietaryRestrictions', 'allergies', 'dislikes'],
  },
  {
    id: 'budget',
    title: 'Budget Settings',
    icon: '💰',
    fields: ['monthlyLimit', 'householdSize', 'shoppingFrequency'],
  },
  {
    id: 'nutrition',
    title: 'Nutritional Goals',
    icon: '🎯',
    fields: ['calorieTarget', 'macroTargets', 'healthGoals', 'activityLevel'],
  },
  {
    id: 'cooking',
    title: 'Cooking Profile',
    icon: '👨‍🍳',
    fields: ['skillLevel', 'availableTime', 'equipment', 'mealPrepPreference'],
  },
  {
    id: 'shopping',
    title: 'Shopping & Stores',
    icon: '🛒',
    fields: [],
  },
];

export function ProfileEditForm({ profile, onUpdate, onRefresh }: ProfileEditFormProps) {
  const { addToast } = useToast();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storeZip, setStoreZip] = useState('');
  const [nearbyStores, setNearbyStores] = useState<StoreInfo[]>([]);
  const [selectedStore, setSelectedStore] = useState<{ id?: string; name?: string }>({});
  const [loadingChains, setLoadingChains] = useState(false);
  const [savingChains, setSavingChains] = useState(false);
  const [chainSuggestions, setChainSuggestions] = useState<StoreInfo[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<Set<string>>(new Set());
  const [showLargeText, setShowLargeText] = useState(false);
  const [userLanguage, setUserLanguage] = useState<'en' | 'es' | 'zh' | 'vi' | 'so' | 'hmn'>('en');

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      console.log('Profile data loaded:', profile); // Debug log
      
      // Ensure all nested objects exist with proper defaults
      const initialFormData: Partial<UserProfile> = {
        ...profile,
        location: profile.location || {
          zipCode: '',
          city: '',
          state: ''
        },
        preferences: {
          languages: profile.preferences?.languages || [],
          primaryLanguage: profile.preferences?.primaryLanguage || 'en',
          culturalCuisines: profile.preferences?.culturalCuisines || [],
          dietaryRestrictions: profile.preferences?.dietaryRestrictions || [],
          allergies: profile.preferences?.allergies || [],
          dislikes: profile.preferences?.dislikes || [],
          preferFreshProduce: (profile.preferences as any)?.preferFreshProduce ?? true,
          // Additional fields from wizard (stored as metadata)
          culturalBackground: (profile.preferences as any)?.culturalBackground || [],
          traditionalCookingMethods: (profile.preferences as any)?.traditionalCookingMethods || [],
          religiousRestrictions: (profile.preferences as any)?.religiousRestrictions || []
        },
        budget: profile.budget || {
          monthlyLimit: 0,
          householdSize: 1,
          shoppingFrequency: 'weekly' as const
        },
        nutritionalGoals: {
          calorieTarget: profile.nutritionalGoals?.calorieTarget || 2000,
          macroTargets: profile.nutritionalGoals?.macroTargets || { protein: 25, carbs: 45, fat: 30 },
          healthGoals: profile.nutritionalGoals?.healthGoals || [],
          activityLevel: profile.nutritionalGoals?.activityLevel || 'moderate'
        },
        cookingProfile: {
          skillLevel: profile.cookingProfile?.skillLevel || 'beginner' as const,
          availableTime: profile.cookingProfile?.availableTime || 30,
          equipment: profile.cookingProfile?.equipment || [],
          mealPrepPreference: profile.cookingProfile?.mealPrepPreference || false,
          // Additional field from wizard (stored as metadata)
          cookingFrequency: (profile.cookingProfile as any)?.cookingFrequency || 'daily'
        }
      };
      
      console.log('Initialized form data:', initialFormData); // Debug log
      setFormData(initialFormData);
      setStoreZip(
        ((initialFormData as any).preferences?.defaultStore?.zip) ||
        initialFormData.location?.zipCode ||
        ''
      );
      const def = (initialFormData as any).preferences?.defaultStore;
      if (def?.id) setSelectedStore({ id: def.id, name: def.name });
    }
  }, [profile]);

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || !profile) return;

    const timeoutId = setTimeout(async () => {
      await handleAutoSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [formData, hasUnsavedChanges]);

  const handleAutoSave = async () => {
    if (!hasUnsavedChanges || saving) return;

    setSaving(true);
    const success = await onUpdate(formData);
    
    if (success) {
      setHasUnsavedChanges(false);
      addToast({
        type: 'success',
        title: 'Auto-saved',
        message: 'Changes saved automatically',
      });
    }
    setSaving(false);
  };

  const handleFieldChange = (field: string, value: any, section?: string) => {
    console.log('Field change:', { field, value, section, currentValue: section ? (formData as any)[section]?.[field] : (formData as any)[field] }); // Enhanced debug log
    
    setFormData(prev => {
      const updated = { ...prev };
      
      if (section) {
        // Handle nested object updates with proper type safety
        // Ensure the section exists
        if (!updated[section as keyof UserProfile]) {
          (updated as any)[section] = {};
        }
        
        const currentSection = updated[section as keyof UserProfile] as any;
        updated[section as keyof UserProfile] = {
          ...currentSection,
          [field]: value,
        } as any;
      } else {
        // Handle direct field updates
        (updated as any)[field] = value;
      }
      
      console.log('Updated form data:', { 
        section: section ? updated[section as keyof UserProfile] : updated,
        field,
        newValue: value 
      }); // Enhanced debug log
      return updated;
    });
    
    setHasUnsavedChanges(true);
  };

  const handleManualSave = async () => {
    if (!hasUnsavedChanges) return;

    setSaving(true);
    const success = await onUpdate(formData);
    
    if (success) {
      setHasUnsavedChanges(false);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Profile updated successfully',
      });
    }
    setSaving(false);
  };

  const fetchStores = async () => {
    try {
      const zip = storeZip.trim();
      if (!zip) {
        addToast({ type: 'warning', title: 'ZIP required', message: 'Enter a ZIP to search stores' });
        return;
      }
      // Use Google Places API instead of Kroger
      const res = await fetch(`/api/stores/nearby?zip=${encodeURIComponent(zip)}&limit=10`);
      if (!res.ok) throw new Error(`Store lookup failed: ${res.status}`);
      const json = await res.json();
      console.log('Nearby stores response:', json);
      
      const list: StoreInfo[] = (json.data || []).map((s: any) => ({
        id: s.id,
        placeId: s.id,
        name: s.name,
        address: s.address,
        distance: s.distance,
        rating: s.rating,
        userRatingsTotal: s.userRatingsTotal,
        isOpen: s.openNow, // Use openNow from GroceryStore interface
        photo: s.photos?.[0],
        phone: s.phone,
        website: s.website,
        location: s.location,
        features: s.features,
        selected: false
      }));
      
      console.log('Nearby stores mapped:', list.length, 'stores');
      setNearbyStores(list);
      
      if (list[0]) setSelectedStore({ id: list[0].id, name: list[0].name });
      if (list.length > 0) {
        addToast({ type: 'success', title: 'Stores Found', message: `Found ${list.length} stores near ${zip}` });
      } else {
        addToast({ type: 'warning', title: 'No Stores', message: 'No grocery stores found in that area' });
      }
    } catch (e) {
      console.error('Store search error:', e);
      addToast({ type: 'error', title: 'Store search failed', message: 'Could not load stores for that ZIP. Please try again.' });
    }
  };

  const saveDefaultStore = async () => {
    try {
      if (!selectedStore.id) {
        addToast({ type: 'warning', title: 'No store selected', message: 'Choose a store first' });
        return;
      }
      const updates: Partial<UserProfile> = {
        preferences: {
          ...(formData.preferences || ({} as any)),
          defaultStore: { id: selectedStore.id, name: selectedStore.name, zip: storeZip },
        } as any,
      };
      const ok = await onUpdate(updates);
      if (ok) addToast({ type: 'success', title: 'Default store saved', message: selectedStore.name || 'Saved' });
    } catch (e) {
      addToast({ type: 'error', title: 'Save failed', message: 'Could not save default store' });
    }
  };

  const renderShoppingSection = () => {
    // Combine both regular stores and chain suggestions
    const allStores = [...chainSuggestions, ...nearbyStores];
    
    // Function to handle store selection
    const handleStoreSelect = (store: StoreInfo) => {
      const storeId = store.placeId || store.id;
      console.log('Selecting store:', store.name, 'ID:', storeId);
      
      // Update chainSuggestions
      setChainSuggestions(prev => prev.map(s => {
        if ((s.placeId || s.id) === storeId) {
          const newStore = { ...s, selected: !s.selected };
          console.log('Updated chain suggestion:', newStore.name, 'selected:', newStore.selected);
          return newStore;
        }
        return s;
      }));
      
      // Update nearbyStores  
      setNearbyStores(prev => prev.map(s => {
        if ((s.placeId || s.id) === storeId) {
          const newStore = { ...s, selected: !s.selected };
          console.log('Updated nearby store:', newStore.name, 'selected:', newStore.selected);
          return newStore;
        }
        return s;
      }));
    };

    // Function to toggle favorite
    const handleToggleFavorite = (storeId: string) => {
      setFavoriteStores(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(storeId)) {
          newFavorites.delete(storeId);
        } else {
          newFavorites.add(storeId);
        }
        return newFavorites;
      });
    };

    return (
      <div className="space-y-4">
        {/* Search Controls */}
        <div className="border-b border-gray-200 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <input
                type="text"
                value={storeZip}
                onChange={(e) => setStoreZip(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="12345"
              />
            </div>
            <div>
              <button
                onClick={fetchStores}
                className="mt-6 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100"
              >Find Nearby Stores</button>
            </div>
            <div>
              <button
                onClick={fetchChainSuggestions}
                className="mt-6 w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                disabled={loadingChains || !profile?.location?.city}
              >{loadingChains ? 'Finding…' : 'Suggest Major Chains'}</button>
            </div>
          </div>
          
          {/* Accessibility Options */}
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showLargeText}
                onChange={(e) => setShowLargeText(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Large Text Mode</span>
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="language-select" className="text-sm">Language:</label>
              <select
                id="language-select"
                value={userLanguage}
                onChange={(e) => setUserLanguage(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
                <option value="vi">Tiếng Việt</option>
                <option value="so">Soomaali</option>
                <option value="hmn">Hmoob</option>
              </select>
            </div>
          </div>
        </div>

        {/* Store Cards Grid */}
        {allStores.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Available Stores</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allStores.map((store) => (
                <StoreSelectionCard
                  key={store.placeId || store.id}
                  store={store}
                  onSelect={handleStoreSelect}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorite={favoriteStores.has(store.id)}
                  showDistance={true}
                  largeText={showLargeText}
                  language={userLanguage}
                />
              ))}
            </div>
            
            {/* Save Selected Stores */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSelectedChains}
                className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
                disabled={savingChains || !allStores.some(s => s.selected)}
              >
                {savingChains ? 'Saving…' : `Save ${allStores.filter(s => s.selected).length} Selected Stores`}
              </button>
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {allStores.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-4xl mb-3">🛒</div>
            <p className="text-gray-600">No stores loaded yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Enter your ZIP code or click "Suggest Major Chains" to find stores
            </p>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-4">
          These stores will be used for live price checks and shopping plans. You can change them anytime.
        </p>
      </div>
    );
  };

  async function fetchChainSuggestions() {
    try {
      if (!profile?.location?.city) {
        console.log('No city in profile location')
        addToast({ type: 'warning', title: 'Location Required', message: 'Please set your city in Personal Information first' })
        return
      }
      setLoadingChains(true)
      const params = new URLSearchParams({
        city: profile.location.city || '',
        state: profile.location.state || '',
        zip: profile.location.zipCode || '',
        limit: '8',
      })
      console.log('Fetching stores with params:', params.toString())
      const res = await fetch(`/api/stores/suggest?${params.toString()}`, { cache: 'no-store' as any })
      console.log('Store suggest response:', res.status)
      if (!res.ok) throw new Error(`suggest ${res.status}`)
      const json = await res.json()
      console.log('Store suggest data:', json)
      const list: StoreInfo[] = (json.data || []).map((s: any) => ({
        id: s.placeId,
        placeId: s.placeId,
        name: s.name,
        address: s.address,
        city: s.city,
        state: s.state,
        zip: s.zip,
        rating: s.rating,
        userRatingsTotal: s.userRatingsTotal,
        types: s.types || [],
        selected: true,
        category: s.chain?.toLowerCase().includes('costco') || s.chain?.toLowerCase().includes('sam') ? 'budget' : 'primary',
        // Add any missing fields for StoreInfo
        distance: undefined,
        isOpen: undefined,
        phone: undefined,
        website: undefined,
        photo: undefined,
        hours: undefined,
        priceLevel: undefined,
        features: undefined,
        location: undefined
      }))
      console.log('Store suggestions fetched:', list.length, 'stores')
      setChainSuggestions(list)
    } catch (e) {
      addToast({ type: 'error', title: 'Suggestion failed', message: 'Could not fetch store suggestions' })
    } finally {
      setLoadingChains(false)
    }
  }

  function toggleChainSelection(index: number) {
    setChainSuggestions(prev => prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s)))
  }

  async function saveSelectedChains() {
    try {
      const selectedFromChains = chainSuggestions.filter(s => s.selected)
      const selectedFromNearby = nearbyStores.filter(s => s.selected)
      const toSave = [...selectedFromChains, ...selectedFromNearby]
      console.log('Selected stores to save:', toSave.length, toSave)
      
      if (toSave.length === 0) {
        addToast({ type: 'warning', title: 'No stores selected', message: 'Please select stores to save first' })
        return
      }
      setSavingChains(true)
      
      // Map StoreInfo to SaveStoreInput format
      const storesToSave = toSave.map(store => ({
        placeId: store.placeId || store.id,
        name: store.name,
        address: store.address,
        rating: store.rating,
        types: store.types,
        website: store.website,
        phone: store.phone,
        location: store.location,
        userRatingsTotal: store.userRatingsTotal,
        priceLevel: store.priceLevel,
        features: store.features
      }))
      
      console.log('Mapped stores to save:', storesToSave)
      
      const res = await fetch('/api/stores/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: storesToSave }),
      })
      
      const responseData = await res.json()
      console.log('Save response:', res.status, responseData)
      
      if (!res.ok) throw new Error(responseData.error || 'save failed')
      
      // Clear selected state from both arrays after successful save
      setChainSuggestions(prev => prev.map(s => ({ ...s, selected: false })))
      setNearbyStores(prev => prev.map(s => ({ ...s, selected: false })))
      
      addToast({ type: 'success', title: 'Stores saved', message: `${toSave.length} stores saved with complete information for pricing` })
    } catch (e) {
      console.error('Save error:', e)
      addToast({ type: 'error', title: 'Save failed', message: `Could not save selected stores: ${e}` })
    } finally {
      setSavingChains(false)
    }
  }

  const renderPersonalSection = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your full name"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zip Code
          </label>
          <input
            type="text"
            value={formData.location?.zipCode || ''}
            onChange={(e) => handleFieldChange('zipCode', e.target.value, 'location')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="12345"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <input
            type="text"
            value={formData.location?.city || ''}
            onChange={(e) => handleFieldChange('city', e.target.value, 'location')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your city"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          <input
            type="text"
            value={formData.location?.state || ''}
            onChange={(e) => handleFieldChange('state', e.target.value, 'location')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="State"
          />
        </div>
      </div>
    </div>
  );

  const renderCulturalSection = () => {
    // Use the same cultural cuisines as the wizard
    const CULTURAL_CUISINES = [
      { id: 'mediterranean', name: 'Mediterranean', flag: '🇬🇷' },
      { id: 'asian', name: 'Asian', flag: '🍜' },
      { id: 'indian', name: 'Indian', flag: '🇮🇳' },
      { id: 'middle-eastern', name: 'Middle Eastern', flag: '🇹🇷' },
      { id: 'latin-american', name: 'Latin American', flag: '🇲🇽' },
      { id: 'african', name: 'African', flag: '🌍' },
      { id: 'caribbean', name: 'Caribbean', flag: '🏝️' },
      { id: 'european', name: 'European', flag: '🇪🇺' },
      { id: 'american', name: 'American', flag: '🇺🇸' },
      { id: 'fusion', name: 'Fusion', flag: '🌐' },
    ];

    const CULTURAL_BACKGROUNDS = [
      'African', 'African American', 'Arab', 'Asian', 'Caribbean', 'East Asian',
      'European', 'Hispanic/Latino', 'Indian', 'Indigenous', 'Jewish', 'Mediterranean',
      'Middle Eastern', 'Mixed Heritage', 'Native American', 'Pacific Islander',
      'South Asian', 'Southeast Asian', 'Other'
    ];

    const COOKING_METHODS = [
      { id: 'stir-frying', name: 'Stir-frying' },
      { id: 'slow-cooking', name: 'Slow cooking/Braising' },
      { id: 'grilling', name: 'Grilling/BBQ' },
      { id: 'steaming', name: 'Steaming' },
      { id: 'fermentation', name: 'Fermentation' },
      { id: 'clay-pot', name: 'Clay pot cooking' },
      { id: 'tandoor', name: 'Tandoor/High-heat' },
      { id: 'smoking', name: 'Smoking' },
      { id: 'pressure-cooking', name: 'Pressure cooking' },
      { id: 'wok-hei', name: 'Wok hei technique' },
      { id: 'tagine', name: 'Tagine cooking' },
      { id: 'comal', name: 'Comal/Griddle' },
    ];

    return (
      <div className="space-y-6">
        {/* Cultural Cuisines */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cultural Cuisines
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CULTURAL_CUISINES.map((cuisine) => (
              <button
                key={cuisine.id}
                onClick={() => {
                  const current = formData.preferences?.culturalCuisines || [];
                  const updated = current.includes(cuisine.id)
                    ? current.filter(c => c !== cuisine.id)
                    : [...current, cuisine.id];
                  handleFieldChange('culturalCuisines', updated, 'preferences');
                }}
                className={`flex items-center p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.preferences?.culturalCuisines?.includes(cuisine.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-lg mr-2">{cuisine.flag}</span>
                <span className="text-sm font-medium">{cuisine.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cultural Background */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cultural Background
            <span className="text-sm font-normal text-gray-600 ml-2">(Optional)</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CULTURAL_BACKGROUNDS.map((background) => {
              const isSelected = (formData.preferences as any)?.culturalBackground?.includes(background) || false;
              return (
                <button
                  key={background}
                  type="button"
                  onClick={() => {
                    const current = (formData.preferences as any)?.culturalBackground || [];
                    const updated = current.includes(background)
                      ? current.filter((b: string) => b !== background)
                      : [...current, background];
                    handleFieldChange('culturalBackground', updated, 'preferences');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {background}
                </button>
              );
            })}
          </div>
        </div>

        {/* Traditional Cooking Methods */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Traditional Cooking Methods
            <span className="text-sm font-normal text-gray-600 ml-2">(Optional)</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {COOKING_METHODS.map((method) => {
              const isSelected = (formData.preferences as any)?.traditionalCookingMethods?.includes(method.id) || false;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    const current = (formData.preferences as any)?.traditionalCookingMethods || [];
                    const updated = current.includes(method.id)
                      ? current.filter((m: string) => m !== method.id)
                      : [...current, method.id];
                    handleFieldChange('traditionalCookingMethods', updated, 'preferences');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {method.name}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {['English', 'Spanish', 'French', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'German', 'Italian', 'Japanese'].map((language) => (
              <button
                key={language}
                onClick={() => {
                  const current = formData.preferences?.languages || [];
                  const updated = current.includes(language)
                    ? current.filter(l => l !== language)
                    : [...current, language];
                  handleFieldChange('languages', updated, 'preferences');
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  formData.preferences?.languages?.includes(language)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {language}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBudgetSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Budget ($)
          </label>
          <input
            type="number"
            value={formData.budget?.monthlyLimit || ''}
            onChange={(e) => handleFieldChange('monthlyLimit', parseFloat(e.target.value) || 0, 'budget')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="500"
            min="0"
            step="10"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Household Size
          </label>
          <input
            type="number"
            value={formData.budget?.householdSize || ''}
            onChange={(e) => handleFieldChange('householdSize', parseInt(e.target.value) || 1, 'budget')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="4"
            min="1"
            max="20"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shopping Frequency
        </label>
        <select
          value={formData.budget?.shoppingFrequency || 'weekly'}
          onChange={(e) => handleFieldChange('shoppingFrequency', e.target.value, 'budget')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    </div>
  );

  const renderDietarySection = () => (
    <div className="space-y-6">
      {/* Ingredient Preferences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ingredient Preferences</label>
        <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean((formData.preferences as any)?.preferFreshProduce)}
            onChange={(e) => handleFieldChange('preferFreshProduce', e.target.checked, 'preferences')}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Prefer fresh produce (e.g., treat “lemon juice” as fresh lemons when possible)</span>
        </label>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Dietary Restrictions
        </label>
        <div className="flex flex-wrap gap-2">
          {['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Low-Fat', 'Halal', 'Kosher'].map((restriction) => {
            const isSelected = formData.preferences?.dietaryRestrictions?.includes(restriction) || false;
            return (
              <button
                key={restriction}
                type="button"
                onClick={() => {
                  const current = formData.preferences?.dietaryRestrictions || [];
                  const updated = current.includes(restriction)
                    ? current.filter(r => r !== restriction)
                    : [...current, restriction];
                  handleFieldChange('dietaryRestrictions', updated, 'preferences');
                }}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {restriction}
              </button>
            );
          })}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Food Allergies
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Select all foods you're allergic to. We'll ensure these are completely avoided.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Sesame', 'Sulfites'].map((allergy) => (
            <button
              key={allergy}
              onClick={() => {
                const current = formData.preferences?.allergies || [];
                const updated = current.includes(allergy)
                  ? current.filter(a => a !== allergy)
                  : [...current, allergy];
                handleFieldChange('allergies', updated, 'preferences');
              }}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                formData.preferences?.allergies?.includes(allergy)
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⚠️ {allergy}
            </button>
          ))}
        </div>
      </div>

      {/* Dislikes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Food Dislikes
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Foods you prefer to avoid. We'll minimize these in your meal plans.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Mushrooms', 'Onions', 'Garlic', 'Cilantro', 'Spicy Food', 'Seafood', 'Organ Meat', 'Tofu', 'Beans', 'Broccoli', 'Brussels Sprouts', 'Blue Cheese'].map((dislike) => (
            <button
              key={dislike}
              onClick={() => {
                const current = formData.preferences?.dislikes || [];
                const updated = current.includes(dislike)
                  ? current.filter(d => d !== dislike)
                  : [...current, dislike];
                handleFieldChange('dislikes', updated, 'preferences');
              }}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                formData.preferences?.dislikes?.includes(dislike)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {dislike}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNutritionSection = () => (
    <div className="space-y-6">
      {/* Calorie Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Calorie Target
          </label>
          <input
            type="number"
            value={formData.nutritionalGoals?.calorieTarget || ''}
            onChange={(e) => handleFieldChange('calorieTarget', parseInt(e.target.value) || 0, 'nutritionalGoals')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="2000"
            min="1000"
            max="5000"
            step="50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activity Level
          </label>
          <select
            value={formData.nutritionalGoals?.activityLevel || 'moderate'}
            onChange={(e) => handleFieldChange('activityLevel', e.target.value, 'nutritionalGoals')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="sedentary">Sedentary (little/no exercise)</option>
            <option value="light">Light (light exercise 1-3 days/week)</option>
            <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
            <option value="active">Active (hard exercise 6-7 days/week)</option>
            <option value="very_active">Very Active (very hard exercise, physical job)</option>
          </select>
        </div>
      </div>

      {/* Health Goals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Health Goals
        </label>
        <div className="flex flex-wrap gap-2">
          {['Weight Loss', 'Weight Gain', 'Muscle Building', 'Heart Health', 'Lower Cholesterol', 'Manage Diabetes', 'Increase Energy', 'Better Digestion', 'Improve Sleep'].map((goal) => {
            const isSelected = formData.nutritionalGoals?.healthGoals?.includes(goal) || false;
            return (
              <button
                key={goal}
                type="button"
                onClick={() => {
                  const current = formData.nutritionalGoals?.healthGoals || [];
                  const updated = current.includes(goal)
                    ? current.filter(g => g !== goal)
                    : [...current, goal];
                  handleFieldChange('healthGoals', updated, 'nutritionalGoals');
                }}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {goal}
              </button>
            );
          })}
        </div>
      </div>

      {/* Macro Targets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Macronutrient Targets (%)
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Carbohydrates
            </label>
            <input
              type="number"
              value={formData.nutritionalGoals?.macroTargets?.carbs || 45}
              onChange={(e) => {
                const current = formData.nutritionalGoals?.macroTargets || { carbs: 45, protein: 25, fat: 30 };
                handleFieldChange('macroTargets', { ...current, carbs: parseInt(e.target.value) || 45 }, 'nutritionalGoals');
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="10"
              max="70"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Protein
            </label>
            <input
              type="number"
              value={formData.nutritionalGoals?.macroTargets?.protein || 25}
              onChange={(e) => {
                const current = formData.nutritionalGoals?.macroTargets || { carbs: 45, protein: 25, fat: 30 };
                handleFieldChange('macroTargets', { ...current, protein: parseInt(e.target.value) || 25 }, 'nutritionalGoals');
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="10"
              max="50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fat
            </label>
            <input
              type="number"
              value={formData.nutritionalGoals?.macroTargets?.fat || 30}
              onChange={(e) => {
                const current = formData.nutritionalGoals?.macroTargets || { carbs: 45, protein: 25, fat: 30 };
                handleFieldChange('macroTargets', { ...current, fat: parseInt(e.target.value) || 30 }, 'nutritionalGoals');
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="15"
              max="60"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Total should equal 100%. Adjust as needed for your goals.
        </p>
      </div>
    </div>
  );

  const renderCookingSection = () => {
    // Use the same equipment as the wizard
    const COOKING_EQUIPMENT = [
      { id: 'basic-stove', name: 'Stovetop', category: 'Essential' },
      { id: 'oven', name: 'Oven', category: 'Essential' },
      { id: 'microwave', name: 'Microwave', category: 'Essential' },
      { id: 'blender', name: 'Blender', category: 'Small Appliances' },
      { id: 'food-processor', name: 'Food Processor', category: 'Small Appliances' },
      { id: 'stand-mixer', name: 'Stand Mixer', category: 'Small Appliances' },
      { id: 'slow-cooker', name: 'Slow Cooker/Crockpot', category: 'Small Appliances' },
      { id: 'pressure-cooker', name: 'Pressure Cooker/Instant Pot', category: 'Small Appliances' },
      { id: 'air-fryer', name: 'Air Fryer', category: 'Small Appliances' },
      { id: 'rice-cooker', name: 'Rice Cooker', category: 'Small Appliances' },
      { id: 'wok', name: 'Wok', category: 'Cookware' },
      { id: 'cast-iron', name: 'Cast Iron Skillet', category: 'Cookware' },
      { id: 'dutch-oven', name: 'Dutch Oven', category: 'Cookware' },
      { id: 'steamer', name: 'Steamer Basket/Insert', category: 'Cookware' },
      { id: 'grill', name: 'Grill (Indoor/Outdoor)', category: 'Specialty' },
      { id: 'mortar-pestle', name: 'Mortar & Pestle', category: 'Specialty' },
    ];

    const COOKING_FREQUENCIES = [
      { id: 'daily', name: 'Daily', description: 'Cook most meals at home' },
      { id: 'few-times-week', name: 'Few times a week', description: 'Cook 3-4 times per week' },
      { id: 'weekly', name: 'Weekly', description: 'Cook 1-2 times per week' },
      { id: 'occasionally', name: 'Occasionally', description: 'Cook when I have time' },
    ];

    const groupedEquipment = COOKING_EQUIPMENT.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category]!.push(item);
      return acc;
    }, {} as Record<string, typeof COOKING_EQUIPMENT>);

    return (
      <div className="space-y-6">
        {/* Skill Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cooking Skill Level
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: 'beginner', label: 'Beginner', desc: 'Basic cooking skills, prefer simple recipes' },
              { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable with most cooking techniques' },
              { value: 'advanced', label: 'Advanced', desc: 'Experienced cook, enjoy complex recipes' }
            ].map((level) => (
              <button
                key={level.value}
                onClick={() => handleFieldChange('skillLevel', level.value, 'cookingProfile')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.cookingProfile?.skillLevel === level.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{level.label}</div>
                <div className="text-sm text-gray-600 mt-1">{level.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Available Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Cooking Time (minutes per day)
          </label>
          <input
            type="number"
            value={formData.cookingProfile?.availableTime || 30}
            onChange={(e) => handleFieldChange('availableTime', parseInt(e.target.value) || 30, 'cookingProfile')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="30"
            min="10"
            max="180"
            step="5"
          />
          <p className="text-sm text-gray-500 mt-1">
            How much time do you typically have for cooking on weekdays?
          </p>
        </div>

        {/* Cooking Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cooking Frequency
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COOKING_FREQUENCIES.map((frequency) => {
              const isSelected = (formData.cookingProfile as any)?.cookingFrequency === frequency.id;
              return (
                <button
                  key={frequency.id}
                  type="button"
                  onClick={() => handleFieldChange('cookingFrequency', frequency.id, 'cookingProfile')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    isSelected
                      ? 'border-green-500 bg-green-50 hover:bg-green-100'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{frequency.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{frequency.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Meal Prep Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Meal Prep Preference
          </label>
          <label className="flex items-center space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={formData.cookingProfile?.mealPrepPreference || false}
              onChange={(e) => handleFieldChange('mealPrepPreference', e.target.checked, 'cookingProfile')}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-900">Yes, I enjoy meal prepping</span>
              <p className="text-sm text-gray-600">
                We'll suggest recipes that work well for batch cooking and storage
              </p>
            </div>
          </label>
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Available Kitchen Equipment
            <span className="text-sm font-normal text-gray-600 ml-2">(Select all that you have)</span>
          </label>
          
          {Object.entries(groupedEquipment).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h5 className="text-sm font-medium text-gray-800 mb-2">{category}</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {items.map((equipment) => (
                  <button
                    key={equipment.id}
                    onClick={() => {
                      const current = formData.cookingProfile?.equipment || [];
                      const updated = current.includes(equipment.id)
                        ? current.filter(e => e !== equipment.id)
                        : [...current, equipment.id];
                      handleFieldChange('equipment', updated, 'cookingProfile');
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      formData.cookingProfile?.equipment?.includes(equipment.id)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {equipment.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSection = (section: EditableSection) => {
    switch (section.id) {
      case 'personal':
        return renderPersonalSection();
      case 'cultural':
        return renderCulturalSection();
      case 'dietary':
        return renderDietarySection();
      case 'budget':
        return renderBudgetSection();
      case 'nutrition':
        return renderNutritionSection();
      case 'cooking':
        return renderCookingSection();
      case 'shopping':
        return renderShoppingSection();
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Section editing coming soon...</p>
            <p className="text-sm mt-2">This section will be available in a future update.</p>
          </div>
        );
    }
  };

  if (!profile) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">👤</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Found</h3>
        <p className="text-gray-600 mb-4">Please complete your profile setup first.</p>
        <button
          onClick={onRefresh}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="text-blue-500 text-lg mr-3">ℹ️</span>
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Complete Profile Management</h3>
            <p className="text-sm text-blue-800">
              Update all your preferences in one place. Changes are automatically saved as you edit. 
              This includes your food preferences, cultural settings, dietary needs, budget, and cooking profile.
            </p>
          </div>
        </div>
      </div>

      {/* Save Status Indicator */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Saving changes...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Unsaved changes</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">All changes saved</span>
            </>
          )}
        </div>
        
        {hasUnsavedChanges && (
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Save Now
          </button>
        )}
      </div>

      {/* Editable Sections */}
      <div className="space-y-4">
        {editableSections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
              className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{section.icon}</span>
                <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
              </div>
              <span className="text-gray-400">
                {editingSection === section.id ? '▼' : '▶'}
              </span>
            </button>
            
            {editingSection === section.id && (
              <div className="px-6 py-4 bg-white border-t border-gray-200">
                {renderSection(section)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Profile Summary */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Profile Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Name:</span>
            <span className="ml-2 text-blue-700">{profile.name || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Location:</span>
            <span className="ml-2 text-blue-700">
              {profile.location?.city && profile.location?.state 
                ? `${profile.location.city}, ${profile.location.state}`
                : 'Not set'
              }
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Budget:</span>
            <span className="ml-2 text-blue-700">
              ${profile.budget?.monthlyLimit || 0}/month for {profile.budget?.householdSize || 1} people
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Cuisines:</span>
            <span className="ml-2 text-blue-700">
              {profile.preferences?.culturalCuisines?.length || 0} selected
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Dietary:</span>
            <span className="ml-2 text-blue-700">
              {profile.preferences?.dietaryRestrictions?.length || 0} restrictions, {profile.preferences?.allergies?.length || 0} allergies
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Health:</span>
            <span className="ml-2 text-blue-700">
              {profile.nutritionalGoals?.calorieTarget || 'No target'} cal/day, {profile.nutritionalGoals?.activityLevel || 'Not set'}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Cooking:</span>
            <span className="ml-2 text-blue-700">
              {profile.cookingProfile?.skillLevel || 'Not set'} level, {profile.cookingProfile?.equipment?.length || 0} equipment
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Languages:</span>
            <span className="ml-2 text-blue-700">
              {profile.preferences?.languages?.length || 0} selected
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Default Store:</span>
            <span className="ml-2 text-blue-700">
              {((profile.preferences as any)?.defaultStore?.name) || 'Not set'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section renderer
// (Note: renderSection is defined within the component to capture local state.)
