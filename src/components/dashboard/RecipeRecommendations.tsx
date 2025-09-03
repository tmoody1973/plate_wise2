'use client';

import React, { useEffect, useState } from 'react';
import { useProfileSetup } from '@/hooks/useProfileSetup';

interface RecItem {
  id: string
  title: string
  url: string
  source: string
  summary: string
  cuisineTags: string[]
  dietaryTags: string[]
}

export function RecipeRecommendations() {
  const { profile, isLoading: profileLoading } = useProfileSetup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecItem[]>([]);

  useEffect(() => {
    const fetchRecs = async () => {
      if (!profile) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile }),
        })
        if (!res.ok) throw new Error(`Failed: ${res.status}`)
        const data = await res.json()
        setItems(data.data || [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load recommendations')
      } finally {
        setLoading(false)
      }
    }
    if (!profileLoading) {
      void fetchRecs()
    }
  }, [profileLoading, profile])

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recommended Recipes</h3>
        <div className="text-xs text-gray-500">Powered by Tavily</div>
      </div>

      {profileLoading || loading ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600">No recommendations yet. Update your cultural cuisines and dietary preferences in your profile.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.slice(0, 5).map(item => (
            <li key={item.id} className="py-4">
              <a href={item.url} target="_blank" rel="noreferrer" className="text-gray-900 font-medium hover:underline">
                {item.title}
              </a>
              <div className="text-xs text-gray-500 mt-1">{item.source}</div>
              {item.summary && <p className="text-sm text-gray-600 mt-2">{item.summary}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.cuisineTags.map(tag => (
                  <span key={`c_${tag}`} className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded-full border border-orange-100">{tag}</span>
                ))}
                {item.dietaryTags.map(tag => (
                  <span key={`d_${tag}`} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full border border-green-100">{tag}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

