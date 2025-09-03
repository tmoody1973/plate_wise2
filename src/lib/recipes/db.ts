// Supabase helpers for bulk upserting recipes by source_url
// Uses env SUPABASE_URL and SUPABASE_ANON_KEY

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { RecipeT } from './schema'

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service-role on server to bypass RLS for server-side ingestion
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceKey || anonKey
  if (!url || !key) {
    throw new Error('Missing Supabase URL or key in environment')
  }
  return createClient(url, key)
}

export async function upsertRecipes(recipes: RecipeT[]) {
  if (!recipes.length) return { rows: [] as any[] }
  const supabase = getSupabase()

  const rows: any[] = []
  for (const r of recipes) {
    const cuisine = r.cuisine || 'international'
    const metadata: Record<string, any> = {}
    if (r.servings != null) metadata.servings = r.servings
    if (r.total_time_minutes != null) metadata.total_time_minutes = r.total_time_minutes
    if ((r as any).difficulty) metadata.difficulty = (r as any).difficulty
    if (r.image) metadata.image_url = r.image
    if (r.source) metadata.source_url = r.source

    // Check if a recipe with the same source_url exists in metadata
    let existingId: string | null = null
    if (metadata.source_url) {
      const { data: existing, error: selErr } = await supabase
        .from('recipes')
        .select('id')
        .filter('metadata->>source_url', 'eq', String(metadata.source_url))
        .limit(1)
      if (selErr) throw new Error(`Supabase select failed: ${selErr.message}`)
      if (existing && existing.length > 0 && existing[0]) existingId = existing[0].id
    }

    const record: any = {
      title: r.title,
      description: r.description ?? null,
      cultural_origin: [],
      cuisine,
      ingredients: r.ingredients,
      instructions: r.instructions,
      nutritional_info: r.nutrition ?? null,
      cost_analysis: null,
      metadata,
      tags: [],
      source: 'community' as const,
      is_public: true,
    }

    // Store image only in metadata.image_url to keep schema simple

    if (existingId) {
      const { data: upd, error: upErr } = await supabase
        .from('recipes')
        .update(record)
        .eq('id', existingId)
        .select()
        .single()
      if (upErr) throw new Error(`Supabase upsert failed: ${upErr.message}`)
      rows.push(upd)
    } else {
      const { data: ins, error: inErr } = await supabase
        .from('recipes')
        .insert(record)
        .select()
        .single()
      if (inErr) throw new Error(`Supabase insert failed: ${inErr.message}`)
      rows.push(ins)
    }
  }

  return { rows }
}

/* SQL Note:
Ensure a unique index for dedupe

alter table recipes add constraint recipes_source_url_key unique (source_url);
*/
