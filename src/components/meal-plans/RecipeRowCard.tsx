'use client'

import React from 'react'
import { Bookmark, Shuffle, Clock, Users } from 'lucide-react'

type Props = {
  recipe: any
  onSwap: (e: React.MouseEvent) => void
  onSave?: (e: React.MouseEvent) => void
  onRemove?: (e: React.MouseEvent) => void
  onSurprise?: (e: React.MouseEvent) => void
  onView?: (e: React.MouseEvent) => void
}

function formatMoney(n?: number) {
  if (!n || !Number.isFinite(n)) return undefined
  return `$${n.toFixed(2)}`
}

export function RecipeRowHeader({ recipe, onSwap, onSave, onRemove, onSurprise, onView }: Props) {
  const title: string = recipe?.title || 'Recipe'
  const desc: string = recipe?.description || ''
  const cuisine: string = recipe?.cuisine || (recipe?.culturalOrigin?.[0] || '')
  const servings: number = recipe?.metadata?.servings || recipe?.servings || 0
  const totalTime: number = recipe?.metadata?.totalTime || recipe?.metadata?.totalTimeMinutes || recipe?.totalTimeMinutes || 0
  const price = formatMoney(recipe?.pricing?.totalCost)
  const perServing = recipe?.pricing?.costPerServing ? formatMoney(recipe?.pricing?.costPerServing) : undefined
  const imageUrl: string | undefined = recipe?.imageUrl || recipe?.image || recipe?.metadata?.imageUrl
  const sourceUrl: string | undefined = recipe?.sourceUrl || recipe?.metadata?.sourceUrl || recipe?.source

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        {imageUrl && (
          <img src={imageUrl} alt={title} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
        )}
        <div className="min-w-0">
          <div className="text-xl md:text-2xl font-semibold leading-7 line-clamp-2">{title}</div>
          {desc && <div className="text-sm text-gray-700 line-clamp-1 mt-0.5">{desc}</div>}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {totalTime ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full"><Clock className="w-3 h-3" />{totalTime} min</span>
            ) : null}
            {servings ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full"><Users className="w-3 h-3" />{servings} servings</span>
            ) : null}
            {cuisine ? (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{cuisine}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-2xl md:text-3xl font-extrabold text-orange-600 leading-6">{price || ''}</div>
        {perServing && <div className="text-xs text-gray-600">{perServing} per serving</div>}
        <div className="flex gap-2">
          {onSave && (
            <button onClick={(e)=>{e.stopPropagation(); onSave(e)}} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"><Bookmark className="w-4 h-4"/> Save Recipe</button>
          )}
          <button onClick={(e)=>{e.stopPropagation(); onSwap(e)}} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"><Shuffle className="w-4 h-4"/> Swap Recipe</button>
          {onRemove && (
            <button onClick={(e)=>{e.stopPropagation(); onRemove(e)}} className="px-2 py-1.5 rounded text-sm text-gray-600">Remove</button>
          )}
          {onView && (
            <button onClick={(e)=>{e.stopPropagation(); onView(e)}} className="px-2 py-1.5 rounded text-sm text-blue-700">View</button>
          )}
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" onClick={(e)=> e.stopPropagation()} className="px-2 py-1.5 rounded text-sm text-gray-700 hover:underline">View Original</a>
          )}
        </div>
      </div>
    </div>
  )
}
