import { NextRequest, NextResponse } from 'next/server';
import { googlePlacesService } from '@/lib/external-apis/google-places-service';
import { geocodingService } from '@/lib/external-apis/geocoding-service';
import { fallbackGeocodingService } from '@/lib/external-apis/fallback-geocoding';

export interface StoreDiscoveryRequest {
  location?: string; // City name or address
  coordinates?: { lat: number; lng: number };
  zipCode?: string;
  radius?: number; // in meters
  storeTypes?: string[];
  maxResults?: number;
}

export interface StoreDiscoveryResponse {
  success: boolean;
  stores: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
    phone?: string;
    website?: string;
    rating?: number;
    priceLevel?: number;
    storeType: string;
    distance?: number;
    openNow?: boolean;
    openingHours?: string[];
  }>;
  location: {
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StoreDiscoveryRequest = await request.json();
    
    const {
      location,
      coordinates,
      zipCode,
      radius = 10000, // 10km default
      storeTypes = ['grocery', 'supermarket'],
      maxResults = 20
    } = body;

    console.log('🔍 Store discovery request:', { location, coordinates, zipCode });

    // Step 1: Get coordinates for the location
    let targetCoordinates: { lat: number; lng: number };
    let locationInfo: { city: string; state: string; zipCode: string };

    if (coordinates) {
      // Use provided coordinates
      targetCoordinates = coordinates;
      
      // Reverse geocode to get location info
      const reverseResult = await geocodingService.reverseGeocode(coordinates.lat, coordinates.lng);
      if (reverseResult) {
        locationInfo = {
          city: reverseResult.city,
          state: reverseResult.state,
          zipCode: reverseResult.zipCode
        };
      } else {
        locationInfo = { city: '', state: '', zipCode: zipCode || '' };
      }
    } else if (location) {
      // Try Google geocoding first, fallback to local database
      let geocodeResult = null;
      try {
        geocodeResult = await geocodingService.geocodeAddress(location);
      } catch (error) {
        console.warn('Google geocoding failed, using fallback:', error);
      }
      
      if (geocodeResult) {
        targetCoordinates = geocodeResult.coordinates;
        locationInfo = {
          city: geocodeResult.city,
          state: geocodeResult.state,
          zipCode: geocodeResult.zipCode
        };
      } else {
        // Use fallback geocoding
        const fallbackResult = fallbackGeocodingService.getCityData(location);
        if (!fallbackResult) {
          return NextResponse.json({
            success: false,
            error: `Could not find coordinates for location: ${location}`
          }, { status: 400 });
        }
        
        targetCoordinates = fallbackResult.coordinates;
        locationInfo = {
          city: fallbackResult.city,
          state: fallbackResult.state,
          zipCode: fallbackResult.zipCode
        };
      }
    } else if (zipCode) {
      // Try Google geocoding first, fallback to local database
      let geocodeResult = null;
      try {
        geocodeResult = await geocodingService.geocodeAddress(zipCode);
      } catch (error) {
        console.warn('Google geocoding failed, using fallback:', error);
      }
      
      if (geocodeResult) {
        targetCoordinates = geocodeResult.coordinates;
        locationInfo = {
          city: geocodeResult.city,
          state: geocodeResult.state,
          zipCode: geocodeResult.zipCode || zipCode
        };
      } else {
        // Try to find by zip code in fallback data
        const fallbackResult = fallbackGeocodingService.getCityData(zipCode);
        if (!fallbackResult) {
          return NextResponse.json({
            success: false,
            error: `Could not find coordinates for zip code: ${zipCode}`
          }, { status: 400 });
        }
        
        targetCoordinates = fallbackResult.coordinates;
        locationInfo = {
          city: fallbackResult.city,
          state: fallbackResult.state,
          zipCode: fallbackResult.zipCode
        };
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Must provide location, coordinates, or zipCode'
      }, { status: 400 });
    }

    console.log('📍 Target location:', { targetCoordinates, locationInfo });

    // Step 2: Find nearby grocery stores using Google Places, with fallback
    let nearbyStores = [];
    try {
      nearbyStores = await googlePlacesService.findNearbyGroceryStores(
        targetCoordinates,
        radius,
        {
          minRating: 3.0, // Only include stores with decent ratings
          openNow: false  // Include all stores, not just open ones
        }
      );
      console.log(`🏪 Found ${nearbyStores.length} nearby stores via Google Places`);
    } catch (error) {
      console.warn('Google Places API failed, using fallback stores:', error);
      
      // Use fallback stores from our database
      const fallbackStores = fallbackGeocodingService.getCommonStores(`${locationInfo.city}, ${locationInfo.state}`);
      nearbyStores = fallbackStores.map((storeName, index) => ({
        id: `fallback_${index}`,
        name: storeName,
        address: `${locationInfo.city}, ${locationInfo.state} ${locationInfo.zipCode}`,
        location: targetCoordinates,
        storeType: 'grocery' as const,
        specialties: [],
        distance: undefined,
        photos: [],
        reviews: []
      }));
      console.log(`🏪 Using ${nearbyStores.length} fallback stores`);
    }

    // Step 3: Convert to our API format and filter
    const formattedStores = nearbyStores
      .slice(0, maxResults)
      .map(store => {
        // Parse address components safely
        const address = store.address || `${locationInfo.city}, ${locationInfo.state} ${locationInfo.zipCode}`;
        const addressParts = address.split(',');
        const city = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() || locationInfo.city : locationInfo.city;
        const stateZip = addressParts.length > 0 ? addressParts[addressParts.length - 1]?.trim() || '' : '';
        const stateMatch = stateZip.match(/([A-Z]{2})\s*(\d{5})/);
        const state = stateMatch?.[1] || locationInfo.state;
        const extractedZip = stateMatch?.[2] || locationInfo.zipCode;

        return {
          id: store.id,
          name: store.name,
          address: address,
          city: city,
          state: state,
          zipCode: extractedZip,
          coordinates: store.location,
          rating: store.rating,
          priceLevel: store.priceLevel,
          storeType: store.storeType,
          distance: store.distance,
          openNow: store.openNow,
          openingHours: store.openingHours
        };
      });

    // Step 4: Get store names for the location (simplified list for dropdowns)
    const storeNames = formattedStores
      .map(store => store.name)
      .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates
      .sort();

    console.log(`✅ Returning ${formattedStores.length} formatted stores`);

    return NextResponse.json({
      success: true,
      stores: formattedStores,
      storeNames,
      location: {
        ...locationInfo,
        coordinates: targetCoordinates
      }
    } as StoreDiscoveryResponse);

  } catch (error) {
    console.error('Store discovery error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Store discovery failed'
    }, { status: 500 });
  }
}

// GET endpoint for quick store name lookup by location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const zipCode = searchParams.get('zipCode');
    
    if (!location && !zipCode) {
      return NextResponse.json({
        success: false,
        error: 'Must provide location or zipCode parameter'
      }, { status: 400 });
    }

    // Quick lookup for store names only
    const result = await POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({
        location: location || undefined,
        zipCode: zipCode || undefined,
        maxResults: 15,
        radius: 8000 // 8km for quicker results
      })
    }));

    if (!result.ok) {
      const errorData = await result.json();
      return NextResponse.json(errorData, { status: result.status });
    }

    const data = await result.json();
    
    return NextResponse.json({
      success: true,
      storeNames: data.storeNames,
      location: data.location
    });

  } catch (error) {
    console.error('Store name lookup error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Store lookup failed'
    }, { status: 500 });
  }
}