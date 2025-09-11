"use client"

import { AnimatePresence, motion } from "framer-motion"
import React, { useEffect, useRef, useState } from "react"
import { Search, CheckCircle, Store, Plus, Minus } from 'lucide-react'

type Props = { recipe: any; onClose: () => void; onUpdate?: (next: any) => void }

export function RecipeDialog({ recipe: initialRecipe, onClose, onUpdate }: Props) {
  if (!initialRecipe) return null
  const [recipe, setRecipe] = useState<any>(initialRecipe)

  const title = recipe?.title || 'Recipe'
  const desc = recipe?.description || ''
  const img = recipe?.imageUrl || recipe?.image || recipe?.metadata?.imageUrl
  const servings = recipe?.metadata?.servings || recipe?.servings || 4
  const time = recipe?.metadata?.totalTime || recipe?.metadata?.totalTimeMinutes || recipe?.totalTimeMinutes
  const cuisine = recipe?.cuisine || recipe?.culturalOrigin?.[0]
  const price = recipe?.pricing?.totalCost
  const perServing = recipe?.pricing?.costPerServing
  const sourceUrl = recipe?.sourceUrl || recipe?.metadata?.sourceUrl || recipe?.source

  const [altOpenIndex, setAltOpenIndex] = useState<number | null>(null)
  const [altLoadingIndex, setAltLoadingIndex] = useState<number | null>(null)
  const [altResults, setAltResults] = useState<Record<number, any[]>>({})

  const recalcRecipePricing = (r:any) => {
    try { let total = 0; for (const ing of r.ingredients||[]) { if ((ing?.userStatus||'normal')==='already-have') continue; total += Number(ing?.krogerPrice?.totalCost||0) } r.pricing = r.pricing||{}; r.pricing.totalCost = total; const sv = Number(r?.metadata?.servings||r.servings||4)||1; r.pricing.costPerServing = total/sv; return r } catch { return r }
  }
  const updateLocal = (fn:(r:any)=>any) => setRecipe(prev => { const next = fn({ ...prev }); return next })
  // Notify parent after state commits to avoid setState during render warnings
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    onUpdate?.(recipe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe])
  const updateIngredient = (idx:number, mut:(ing:any)=>any) => updateLocal(r=>{ r.ingredients=(r.ingredients||[]).map((ing:any,i:number)=> i===idx? mut({ ...ing }): ing); return recalcRecipePricing(r) })
  const callUpdateIngredientApiIfDbBacked = async (ingredient:any, payload:any) => { const ingId = ingredient?.id || ingredient?.ingredientId; if(!ingId) return null; try{ const resp = await fetch(`/api/ingredients/${ingId}/update`,{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); return await resp.json() } catch { return null } }
  const fetchAlternatives = async (idx:number, ingredient:any) => { try{ setAltOpenIndex(idx); setAltLoadingIndex(idx); const name = ingredient?.name || ingredient?.item || ''; const resp = await fetch('/api/pricing/alternatives',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, limit:8, pricedOnly:true })}); const data = await resp.json(); setAltResults(p=>({ ...p, [idx]: data?.data?.topCandidates||[] })) } finally{ setAltLoadingIndex(null) } }
  const useAlternative = async (idx:number, ingredient:any, alt:any) => { const sub={ productId:alt.productId, description:alt.description, name:alt.description, cleanName:alt.description, price:alt.price, unitPrice:alt.price, brand:alt.brand, size:alt.size, confidence:String(Math.round((alt.confidence||0)*100))+'%' }; updateIngredient(idx, ing=>({ ...ing, name: sub.cleanName||ing.name, isSubstituted:true, krogerPrice:{ ...(ing.krogerPrice||{}), unitPrice: sub.unitPrice, totalCost: sub.price, confidence: sub.confidence, productId: sub.productId, productName: sub.description, size: sub.size, brand: sub.brand }})); await callUpdateIngredientApiIfDbBacked(ingredient, { krogerSubstitution: sub }) }
  const markAlreadyHave = async (idx:number, ingredient:any) => { updateIngredient(idx, ing=>({ ...ing, userStatus:'already-have' })); await callUpdateIngredientApiIfDbBacked(ingredient, { userStatus:'already-have' }) }
  const markSpecialtyStore = async (idx:number, ingredient:any) => { const name = typeof window!=='undefined'? window.prompt('Which specialty store? (optional)', ingredient?.specialtyStore||'') : ''; updateIngredient(idx, ing=>({ ...ing, userStatus:'specialty-store', specialtyStore: name||undefined })); await callUpdateIngredientApiIfDbBacked(ingredient, { userStatus:'specialty-store', specialtyStore: name||undefined }) }
  const parseAmountNumber = (s:any)=>{ if(s===undefined||s===null) return 0; const str=String(s).trim(); if(!str) return 0; const m1=str.match(/^(\d+)\s+(\d+)\/(\d+)$/); if(m1) return parseFloat(m1[1])+(parseFloat(m1[2])/(parseFloat(m1[3])||1)); const m2=str.match(/^(\d+)\/(\d+)$/); if(m2) return parseFloat(m2[1])/(parseFloat(m2[2])||1); const m3=str.match(/^(\d+(?:\.\d+)?)$/); if(m3) return parseFloat(m3[1]); const lm=str.match(/^(\d+(?:\.\d+)?)/); return lm? parseFloat(lm[1]):0 }
  const repriceIngredient = async (idx:number, ingredient:any) => { try{ const name=ingredient?.name||''; const amt=ingredient?.amount? String(ingredient.amount):'1'; const unit=ingredient?.unit? String(ingredient.unit):'each'; const body:any={ ingredients:[{ name, amount:amt, unit }], servings }; const resp=await fetch('/api/pricing/ingredients',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); const data=await resp.json(); const row=data?.data?.perIngredient?.[0]; if(row){ updateIngredient(idx, ing=>({ ...ing, krogerPrice:{ ...(ing.krogerPrice||{}), unitPrice:Number(row.unitPrice||0), totalCost:Number(row.estimatedCost||0), productId: row?.product?.productId||ing?.krogerPrice?.productId, productName: row?.product?.description||ing?.krogerPrice?.productName, size: row?.packageSize||ing?.krogerPrice?.size, brand: row?.product?.brand||ing?.krogerPrice?.brand }})) } } catch {} }
  const stepAmount = async (idx:number, ingredient:any, delta:number) => { const current=parseAmountNumber(ingredient?.amount??'0'); const next=Math.max(0, Math.round((current+delta)*100)/100); updateIngredient(idx, ing=>({ ...ing, amount:String(next) })); await callUpdateIngredientApiIfDbBacked(ingredient, { amount:String(next) }); await repriceIngredient(idx, { ...ingredient, amount:String(next) }) }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.div className="relative z-[101] w-full max-w-4xl bg-white rounded-2xl shadow-2xl h-[90vh] max-h-[90vh] flex flex-col" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
          {img && (<img src={img} alt={title} className="w-full h-56 md:h-64 object-cover flex-shrink-0" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />)}
          <div className="flex-1 min-h-0 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold leading-7 line-clamp-2">{title}</h3>
                {desc && <p className="text-gray-700 mt-1">{desc}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  {time ? <span className="px-2 py-0.5 bg-gray-100 rounded-full">{time} min</span> : null}
                  {servings ? <span className="px-2 py-0.5 bg-gray-100 rounded-full">{servings} servings</span> : null}
                  {cuisine ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{cuisine}</span> : null}
                </div>
              </div>
              <button className="text-gray-700 hover:text-black" onClick={onClose}>✕</button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-base md:text-lg font-bold tracking-wide text-gray-900 mb-2">INGREDIENTS</div>
                <div className="space-y-2">
                  {(recipe.ingredients || []).map((ing:any, i:number) => {
                    const price = ing?.krogerPrice?.totalCost
                    return (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl border">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold text-gray-900 leading-5 truncate">{ing?.name || ing}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {(ing?.amount || ing?.unit) && (
                                <span className="inline-flex items-center rounded-full bg-white border px-2 py-0.5 text-[12px] text-gray-700">
                                  {(ing?.amount ? String(ing.amount) : '')}{ing?.unit ? ` ${ing.unit}` : ''}
                                </span>
                              )}
                              {ing?.userStatus === 'already-have' && (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[12px]">Already have</span>
                              )}
                              {ing?.userStatus === 'specialty-store' && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[12px]">{`Specialty${ing?.specialtyStore?`: ${ing.specialtyStore}`:''}`}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {ing?.krogerPrice && (
                              <>
                                <div className={`font-bold text-sm ${ing?.userStatus==='already-have' ? 'text-gray-400 line-through' : 'text-green-700'}`}>${Number(ing.krogerPrice.totalCost || 0).toFixed(2)}</div>
                                {ing?.krogerPrice?.unitPrice && (
                                  <div className="text-[11px] text-gray-600">${Number(ing.krogerPrice.unitPrice).toFixed(2)} per {(ing.krogerPrice as any).baseUnit || 'unit'}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button className="px-3 py-1.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); fetchAlternatives(i, ing); }}><Search className="w-3 h-3"/> Find alternatives</button>
                          <button className="px-3 py-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); markAlreadyHave(i, ing); }}><CheckCircle className="w-3 h-3"/> Already have</button>
                          <button className="px-3 py-1.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); markSpecialtyStore(i, ing); }}><Store className="w-3 h-3"/> Specialty store</button>
                        </div>
                        {/* Quantity controls removed in popup to reduce clutter */}
                        {altOpenIndex === i && (
                          <div className="mt-2 p-2 bg-white border rounded">
                            {altLoadingIndex === i && (<div className="text-[11px] text-gray-500">Searching…</div>)}
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto">
                              {(altResults[i] || []).map((alt) => (
                                <div key={alt.productId + alt.description} className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium truncate">{alt.description}</div>
                                    <div className="text-[11px] text-gray-600">${Number(alt.price || 0).toFixed(2)} • {alt.size || 'size n/a'}</div>
                                  </div>
                                  <button className="px-2 py-1 text-xs border rounded bg-blue-600 text-white" onClick={(e)=>{ e.stopPropagation(); useAlternative(i, ing, alt); }}>
                                    Use
                                  </button>
                                </div>
                              ))}
                              {Array.isArray(altResults[i]) && altResults[i].length === 0 && altLoadingIndex !== i && (<div className="text-[11px] text-gray-500">No alternatives found</div>)}
                              <div className="text-right"><button className="text-[11px] text-gray-600" onClick={()=> setAltOpenIndex(null)}>Close</button></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="text-base md:text-lg font-bold tracking-wide text-gray-900 mb-2">👨‍🍳 INSTRUCTIONS</div>
                {(recipe.instructions || []).length ? (
                  <ol className="space-y-3 max-h-[420px] overflow-auto pr-1">
                    {(recipe.instructions || []).map((ins:any, i:number) => (
                      <li key={i} className="flex gap-2 items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold">{i+1}</div>
                        <div className="text-[13px] text-gray-700 leading-relaxed">{typeof ins === 'string' ? ins : (ins?.description || ins?.text || '')}</div>
                      </li>
                    ))}
                  </ol>
                ) : (<div className="text-[12px] text-gray-600">No instructions provided.</div>)}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                {Number.isFinite(price) && (<div className="text-2xl font-extrabold text-orange-600">${price.toFixed(2)}</div>)}
                {Number.isFinite(perServing) && (<div className="text-xs text-gray-600">${perServing.toFixed(2)} per serving</div>)}
              </div>
              <div className="flex gap-2">
                {sourceUrl && (<a href={sourceUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm">Open source</a>)}
                <button onClick={onClose} className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm">Close</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
