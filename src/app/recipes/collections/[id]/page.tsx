"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { recipeDatabaseService } from '@/lib/recipes/recipe-database-service'
import { createUniqueRecipeSlug } from '@/lib/utils/slug'

type Collection = {
  id: string
  user_id: string
  name: string
  description?: string
  is_public: boolean
  recipe_ids: string[]
}

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>()
  const collectionId = useMemo(() => String(params?.id || ''), [params])
  const { user } = useAuthContext()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!collectionId) return
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('recipe_collections')
          .select('*')
          .eq('id', collectionId)
          .single()
        if (error || !data) throw new Error(error?.message || 'Collection not found')
        if (!data.is_public && data.user_id !== user?.id) {
          throw new Error('You do not have access to this collection')
        }
        if (!mounted) return
        setCollection(data as Collection)
        const recs = await recipeDatabaseService.getCollectionRecipes(collectionId, user?.id)
        if (!mounted) return
        setRecipes(recs)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Failed to load collection')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [collectionId, user?.id])

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {loading ? (
            <p className="text-gray-600">Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : collection ? (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
                <p className="text-gray-600">{collection.description || 'No description'}</p>
                <p className="text-xs text-gray-500 mt-1">Visibility: {collection.is_public ? 'Public' : 'Private'}</p>
              </div>
              <div className="border rounded">
                {recipes.length === 0 ? (
                  <p className="p-4 text-gray-600">No recipes in this collection.</p>
                ) : (
                  <ul className="divide-y">
                    {recipes.map(r => (
                      <li key={r.id} className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-sm text-gray-600">{r.cuisine || 'international'}</div>
                        </div>
                        <Link href={`/recipes/${createUniqueRecipeSlug(r.title, r.id)}`} className="text-sm text-blue-600 hover:underline">
                          View
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

