/**
 * Google Maps API Key Notice Component
 * Displays a helpful notice when Google Maps API key is not configured
 */

'use client';

export function GoogleMapsNote() {
  const hasApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (hasApiKey) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <span className="text-yellow-600 text-lg mr-3">⚠️</span>
        <div>
          <h4 className="font-medium text-yellow-900 mb-1">Google Maps Setup Required</h4>
          <p className="text-sm text-yellow-800 mb-2">
            To display store locations on the map, you need to add a Google Maps API key.
          </p>
          <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Get an API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Enable the Maps JavaScript API and Places API</li>
            <li>Add to your .env.local file: <code className="bg-yellow-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key</code></li>
            <li>Restart your development server</li>
          </ol>
        </div>
      </div>
    </div>
  );
}