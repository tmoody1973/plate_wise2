// Re-export the context hook for backward compatibility
export { useUserLocationContext as useUserLocation } from '@/contexts/UserLocationContext';

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