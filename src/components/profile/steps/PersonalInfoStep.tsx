/**
 * Personal information step for profile setup
 * Collects name, location, and language preferences
 */

'use client';

import { useState, useEffect } from 'react';

interface PersonalInfoData {
  name: string;
  location: {
    zipCode: string;
    city: string;
    state: string;
  };
  languages: string[];
  primaryLanguage: string;
}

interface PersonalInfoStepProps {
  data: PersonalInfoData;
  onUpdate: (data: PersonalInfoData) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function PersonalInfoStep({ data, onUpdate }: PersonalInfoStepProps) {
  const [formData, setFormData] = useState(data);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleInputChange = (field: string, value: string | string[]) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'location' && child) {
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            [child]: value,
          },
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleLanguageToggle = (languageCode: string) => {
    setFormData(prev => {
      const isSelected = prev.languages.includes(languageCode);
      const newLanguages = isSelected
        ? prev.languages.filter(lang => lang !== languageCode)
        : [...prev.languages, languageCode];
      
      // If removing the primary language, set the first remaining language as primary
      let newPrimaryLanguage: string = prev.primaryLanguage;
      
      // if user unselected the current primary, pick first remaining language or ''
      const removingCurrentPrimary = isSelected && prev.primaryLanguage === languageCode;
      
      if (removingCurrentPrimary) {
        const first = newLanguages[0]; // string | undefined
        newPrimaryLanguage = first ?? ''; // now always string
      }
      
      return {
        ...prev,
        languages: newLanguages,
        primaryLanguage: newPrimaryLanguage,
      };
    });
  };

  const lookupZipCode = async (zipCode: string) => {
    if (zipCode.length !== 5) return;
    
    setIsLoadingLocation(true);
    try {
      // In a real app, you'd use a ZIP code API like Zippopotam.us
      // For now, we'll simulate the lookup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data - in production, replace with actual API call
      const mockData = {
        '10001': { city: 'New York', state: 'NY' },
        '90210': { city: 'Beverly Hills', state: 'CA' },
        '60601': { city: 'Chicago', state: 'IL' },
        '77001': { city: 'Houston', state: 'TX' },
      };
      
      const locationData = mockData[zipCode as keyof typeof mockData];
      if (locationData) {
        handleInputChange('location.city', locationData.city);
        handleInputChange('location.state', locationData.state);
      }
    } catch (error) {
      console.error('Error looking up ZIP code:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <p className="text-gray-600 mb-6">
          Tell us about yourself so we can personalize your meal planning experience.
        </p>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            formData.name.trim() 
              ? 'border-gray-300 focus:ring-blue-500' 
              : 'border-red-300 focus:ring-red-500'
          }`}
          placeholder="Enter your full name"
          required
        />
      </div>

      {/* Location */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Location</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="zipCode"
                type="text"
                value={formData.location.zipCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                  handleInputChange('location.zipCode', value);
                  if (value.length === 5) {
                    void lookupZipCode(value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
                maxLength={5}
                required
              />
              {isLoadingLocation && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              value={formData.location.city}
              onChange={(e) => handleInputChange('location.city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City"
              required
            />
          </div>
          
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="state"
              value={formData.location.state}
              onChange={(e) => handleInputChange('location.state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select State</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Languages */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Languages</h4>
        <p className="text-sm text-gray-600 mb-4">
          Select all languages you speak. This helps us provide recipes and instructions in your preferred language.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {LANGUAGES.map(language => (
            <label
              key={language.code}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.languages.includes(language.code)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.languages.includes(language.code)}
                onChange={() => handleLanguageToggle(language.code)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{language.name}</span>
            </label>
          ))}
        </div>

        {/* Primary Language */}
        {formData.languages.length > 1 && (
          <div>
            <label htmlFor="primaryLanguage" className="block text-sm font-medium text-gray-700 mb-2">
              Primary Language
            </label>
            <select
              id="primaryLanguage"
              value={formData.primaryLanguage}
              onChange={(e) => handleInputChange('primaryLanguage', e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {formData.languages.map(langCode => {
                const language = LANGUAGES.find(l => l.code === langCode);
                return (
                  <option key={langCode} value={langCode}>
                    {language?.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}