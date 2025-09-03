'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface UserLocation {
  city: string;
  state: string;
  zipCode: string;
  fullLocation: string;
  coordinates?: { lat: number; lng: number };
}

interface UserLocationContextType {
  location: UserLocation;
  stores: string[];
  loading: boolean;
  storesLoading: boolean;
  refreshStores: (locationString: string) => Promise<void>;
  updateLocation: (newLocation: UserLocation) => void;
}

// Fallback data for when API is unavailable
const FALLBACK_LOCATIONS: Record<string, { state: string; zipCode: string; stores: string[] }> = {
  'atlanta': {
    state: 'GA',
    zipCode: '30309',
    stores: ['Kroger', 'Publix', 'Whole Foods Market', 'Walmart', 'Target', 'Aldi']
  },
  'milwaukee': {
    state: 'WI',
    zipCode: '53202',
    stores: ['Pick \'n Save', 'Metro Market', 'Woodman\'s', 'Walmart', 'Target']
  }
};

const UserLocationContext = createContext<UserLocationContextType | undefined>(undefined);

interface UserLocationProviderProps {
  children: React.ReactNode;
}

export function UserLocationProvider({ children }: UserLocationProviderProps) {
  const { user } = useAuthContext();
  const [location, setLocation] = useState<UserLocation>({
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30309',
    fullLocation: 'Atlanta, GA'
  });
  const [stores, setStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(false);

  // Function to fetch stores dynamically
  const fetchStoresForLocation = useCallback(async (locationString: string) => {
    setStoresLoading(true);
    try {
      console.log('🔍 [Context] Fetching stores for location:', locationString);
      
      const response = await fetch('/api/stores/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locationString,
          maxResults: 15,
          radius: 10000 // 10km radius
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.storeNames) {
          console.log(`🏪 [Context] Found ${data.storeNames.length} stores for ${locationString}`);
          setStores(data.storeNames);
          
          // Update location with geocoded data if available
          if (data.location) {
            setLocation(prev => ({
              ...prev,
              city: data.location.city || prev.city,
              state: data.location.state || prev.state,
              zipCode: data.location.zipCode || prev.zipCode,
              coordinates: data.location.coordinates
            }));
          }
          return;
        }
      }
      
      console.warn('[Context] Failed to fetch stores, using fallback');
      // Use fallback stores if API fails
      const cityName = locationString.toLowerCase().split(',')[0].trim();
      const fallback = FALLBACK_LOCATIONS[cityName];
      if (fallback) {
        setStores(fallback.stores);
      } else {
        setStores(FALLBACK_LOCATIONS.atlanta.stores);
      }
      
    } catch (error) {
      console.error('[Context] Error fetching stores:', error);
      // Use fallback on error
      setStores(FALLBACK_LOCATIONS.atlanta.stores);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  // Initialize location from user profile
  useEffect(() => {
    async function fetchUserLocation() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('location, preferences')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('[Context] Profile not found or error fetching profile:', error);
          // Don't throw for common Supabase errors like "Row not found"
          // Just use default location
          setLocation({
            city: 'Atlanta',
            state: 'GA',
            zipCode: '30309',
            fullLocation: 'Atlanta, GA'
          });
          await fetchStoresForLocation('Atlanta, GA');
          return;
        }

        if (profile?.location) {
          // Parse location string (e.g., "Atlanta, GA" or just "Atlanta")
          const locationParts = profile.location.split(',').map((s: string) => s.trim());
          const cityName = locationParts[0];
          const state = locationParts[1] || '';
          
          // Set basic location info first
          const newLocation = {
            city: cityName,
            state: state,
            zipCode: '', // Will be filled by dynamic lookup
            fullLocation: profile.location
          };
          setLocation(newLocation);
          
          // Fetch stores dynamically for this location
          await fetchStoresForLocation(profile.location);
        } else {
          // Default to Atlanta and fetch its stores
          const defaultLocation = {
            city: 'Atlanta',
            state: 'GA',
            zipCode: '30309',
            fullLocation: 'Atlanta, GA'
          };
          setLocation(defaultLocation);
          await fetchStoresForLocation('Atlanta, GA');
        }
      } catch (error) {
        console.warn('[Context] Error fetching user location, using defaults:', error);
        // Set defaults and fetch Atlanta stores
        const defaultLocation = {
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30309',
          fullLocation: 'Atlanta, GA'
        };
        setLocation(defaultLocation);
        await fetchStoresForLocation('Atlanta, GA');
      } finally {
        setLoading(false);
      }
    }

    fetchUserLocation();
  }, [user, fetchStoresForLocation]);

  const updateLocation = useCallback((newLocation: UserLocation) => {
    setLocation(newLocation);
  }, []);

  const contextValue: UserLocationContextType = {
    location,
    stores,
    loading,
    storesLoading,
    refreshStores: fetchStoresForLocation,
    updateLocation
  };

  return (
    <UserLocationContext.Provider value={contextValue}>
      {children}
    </UserLocationContext.Provider>
  );
}

export function useUserLocationContext(): UserLocationContextType {
  const context = useContext(UserLocationContext);
  
  if (context === undefined) {
    throw new Error('useUserLocationContext must be used within a UserLocationProvider');
  }
  
  return context;
}

// Helper function to get location for API calls (legacy support)
export function getUserLocationForAPI(profileLocation?: string): { zipCode: string; city: string; stores: string[] } {
  if (!profileLocation) {
    return {
      zipCode: '30309',
      city: 'Atlanta',
      stores: FALLBACK_LOCATIONS.atlanta.stores
    };
  }

  const cityName = profileLocation.split(',')[0].trim().toLowerCase();
  const cityInfo = FALLBACK_LOCATIONS[cityName];
  
  if (cityInfo) {
    return {
      zipCode: cityInfo.zipCode,
      city: profileLocation.split(',')[0].trim(),
      stores: cityInfo.stores
    };
  }

  // Default fallback
  return {
    zipCode: '30309',
    city: profileLocation.split(',')[0].trim(),
    stores: FALLBACK_LOCATIONS.atlanta.stores
  };
}