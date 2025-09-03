"use client"

import React, { useState, useEffect } from 'react'
import { Search, Loader2, X, RefreshCw, MapPin, DollarSign, Package, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useUserLocation } from '@/hooks/useUserLocation'

interface IngredientSearchModalProps {
  isOpen: boolean
  onClose: () => void
  ingredient: string
  currentStore?: string
  onAlternativeSelect?: (alternative: AlternativeIngredient) => void
}

interface AlternativeIngredient {
  name: string
  storeName: string
  productName: string
  packagePrice: number
  packageSize: string
  storeAddress?: string
  sourceUrl?: string
  substitutionRatio?: string
  notes?: string
}

interface SearchResults {
  structured?: AlternativeIngredient[]
  text: string
  hasStructuredData: boolean
}

export function IngredientSearchModal({
  isOpen,
  onClose,
  ingredient,
  currentStore,
  onAlternativeSelect
}: IngredientSearchModalProps) {
  const [searchType, setSearchType] = useState<'alternatives' | 'substitutes' | 'availability'>('alternatives')
  const [targetStore, setTargetStore] = useState<string>(currentStore || '')
  const [customIngredient, setCustomIngredient] = useState<string>(ingredient)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { location: userLocation, stores: userStores } = useUserLocation()

  // Use stores from user's location
  const AVAILABLE_STORES = userStores || [
    'Any Store',
    'Kroger',
    'Publix', 
    'Whole Foods',
    'Walmart',
    'Target',
    'Aldi',
    'Trader Joe\'s'
  ]

  const handleSearch = async () => {
    if (!customIngredient.trim()) return
    
    setIsSearching(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ingredients/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: customIngredient.trim(),
          store: targetStore || undefined,
          location: userLocation.zipCode, // Using user's actual location
          searchType
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results)
        console.log('🔍 Ingredient search results:', data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Search failed')
      }
    } catch (err) {
      console.error('Ingredient search failed:', err)
      setError('Failed to search for alternatives')
    } finally {
      setIsSearching(false)
    }
  }

  const getSearchTypeDescription = () => {
    switch (searchType) {
      case 'alternatives':
        return 'Find similar products and brands'
      case 'substitutes':
        return 'Find cooking substitutes with ratios'
      case 'availability':
        return 'Check store availability and pricing'
      default:
        return 'Search for ingredient information'
    }
  }

  const handleAlternativeSelect = (alternative: AlternativeIngredient) => {
    onAlternativeSelect?.(alternative)
    onClose()
  }

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n')
    const elements = []
    let currentList = []
    let inTable = false
    let tableRows = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line) {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${elements.length}`} className="mb-4 ml-4 space-y-2">{currentList}</ul>)
          currentList = []
        }
        if (inTable && tableRows.length > 0) {
          elements.push(renderTable(tableRows, elements.length))
          tableRows = []
          inTable = false
        }
        continue
      }
      
      // Handle headers
      if (line.startsWith('**') && line.endsWith('**')) {
        const headerText = line.slice(2, -2)
        elements.push(
          <h3 key={`header-${elements.length}`} className="text-lg font-semibold text-gray-900 mt-6 mb-3 first:mt-0">
            {headerText}
          </h3>
        )
      }
      // Handle table-like content (contains |)
      else if (line.includes('|') && !line.startsWith('|--')) {
        inTable = true
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)
        if (cells.length > 1) {
          tableRows.push(cells)
        }
      }
      // Handle bullet points
      else if (line.startsWith('- ') || line.startsWith('• ')) {
        const itemText = line.substring(2).trim()
        currentList.push(
          <li key={`item-${currentList.length}`} className="text-gray-700 leading-relaxed">
            {itemText}
          </li>
        )
      }
      // Handle numbered lists
      else if (/^\d+\./.test(line)) {
        const itemText = line.replace(/^\d+\.\s*/, '').trim()
        elements.push(
          <div key={`numbered-${elements.length}`} className="flex gap-3 mb-2">
            <span className="text-blue-600 font-semibold min-w-[1.5rem]">{line.match(/^\d+/)?.[0]}.</span>
            <span className="text-gray-700 leading-relaxed">{itemText}</span>
          </div>
        )
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={`para-${elements.length}`} className="text-gray-700 mb-3 leading-relaxed">
            {formatInlineText(line)}
          </p>
        )
      }
    }
    
    // Add any remaining lists or tables
    if (currentList.length > 0) {
      elements.push(<ul key={`list-${elements.length}`} className="mb-4 ml-4 space-y-2">{currentList}</ul>)
    }
    if (inTable && tableRows.length > 0) {
      elements.push(renderTable(tableRows, elements.length))
    }
    
    return elements
  }

  const renderTable = (rows: string[][], key: number) => {
    if (rows.length === 0) return null
    
    const [headerRow, ...dataRows] = rows
    
    return (
      <div key={`table-${key}`} className="overflow-x-auto mb-6">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {headerRow.map((header, index) => (
                <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">
                    {formatInlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const formatInlineText = (text: string) => {
    // Handle bold text
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .split(/(<strong[^>]*>.*?<\/strong>)/)
      .map((part, index) => {
        if (part.includes('<strong')) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />
        }
        return part
      })
  }

  // Update customIngredient when ingredient prop changes
  useEffect(() => {
    setCustomIngredient(ingredient)
  }, [ingredient])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" />
                Find Alternatives
              </h2>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for ingredient:
                </label>
                <input
                  type="text"
                  value={customIngredient}
                  onChange={(e) => setCustomIngredient(e.target.value)}
                  placeholder="e.g., fresh tomatoes, organic flour..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Original: <span className="font-medium">{ingredient}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Search Controls */}
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="alternatives">Find Alternatives</option>
                  <option value="substitutes">Cooking Substitutes</option>
                  <option value="availability">Check Availability</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{getSearchTypeDescription()}</p>
              </div>
              
              {/* Target Store */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Store (Optional)
                </label>
                <select
                  value={targetStore}
                  onChange={(e) => setTargetStore(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Store</option>
                  {AVAILABLE_STORES.filter(store => store !== 'Any Store').map(store => (
                    <option key={store} value={store}>{store}</option>
                  ))}
                </select>
              </div>
              
            </div>
            
            {/* Search Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSearch}
                disabled={isSearching || !customIngredient.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search for Alternatives
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl flex items-start gap-4">
              <div className="bg-red-100 rounded-full p-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-red-800 mb-1">Search Failed</h4>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-xs text-red-600 hover:text-red-800 font-medium underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {searchResults && !isSearching && (
            <div className="space-y-6">
              {searchResults.hasStructuredData && searchResults.structured ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium text-lg">Found {searchResults.structured.length} alternatives</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Search type: <span className="font-medium capitalize">{searchType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="grid gap-6">
                    {searchResults.structured.map((alternative, index) => (
                      <div 
                        key={index}
                        className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 relative overflow-hidden"
                      >
                        {/* Availability indicator */}
                        <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-green-400 to-green-500" />
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-bold text-gray-900">{alternative.name}</h3>
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Available</span>
                              </div>
                            </div>
                            
                            {alternative.substitutionRatio && (
                              <div className="mb-3">
                                <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-sm font-medium rounded-full border border-orange-200">
                                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                                  Substitution: {alternative.substitutionRatio}
                                </span>
                              </div>
                            )}
                            
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <p className="text-gray-900 font-medium mb-2">{alternative.productName}</p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                                  <MapPin className="w-4 h-4" />
                                  <span className="font-medium">{alternative.storeName}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                                  <DollarSign className="w-4 h-4" />
                                  <span className="font-bold text-lg">${alternative.packagePrice.toFixed(2)}</span>
                                </div>
                                
                                {alternative.packageSize && (
                                  <div className="flex items-center gap-2 text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                                    <Package className="w-4 h-4" />
                                    <span className="font-medium">{alternative.packageSize}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {alternative.storeAddress && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700 mb-1">
                                  <MapPin className="w-4 h-4" />
                                  <span className="font-medium text-sm">Store Location</span>
                                </div>
                                <p className="text-sm text-blue-600">{alternative.storeAddress}</p>
                              </div>
                            )}
                            
                            {alternative.notes && (
                              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="bg-amber-100 rounded-full p-1.5 mt-0.5">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-amber-800 mb-1">Important Notes</h5>
                                    <p className="text-sm text-amber-700 leading-relaxed">{alternative.notes}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-3 min-w-[120px]">
                            <button
                              onClick={() => handleAlternativeSelect(alternative)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Select This
                            </button>
                            
                            {alternative.sourceUrl && (
                              <a
                                href={alternative.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm text-center hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 justify-center"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Details
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-blue-600 mb-4">
                    <Search className="w-5 h-5" />
                    <span className="font-medium">Search Results</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                    <div className="prose prose-sm max-w-none">
                      {renderFormattedText(searchResults.text)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!searchResults && !isSearching && !error && (
            <div className="text-center py-16 text-gray-500">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to find alternatives</h3>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                Modify the ingredient name above if needed, choose your search type, and click "Search for Alternatives" to discover better options.
              </p>
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Alternative products</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Cooking substitutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Store availability</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IngredientSearchModal