'use client';

import React, { useState } from 'react';

interface TavilyResult {
  title: string
  url: string
  content: string
}

interface TavilySearchProps {
  onImported: (createInput: any) => void
}

export function TavilySearch({ onImported }: TavilySearchProps) {
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TavilyResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/search/tavily', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, country })
      })
      if (!resp.ok) throw new Error(`Search failed: ${resp.status}`)
      const json = await resp.json()
      setResults(json?.data || [])
    } catch (e: any) {
      setError(e?.message || 'Search failed')
    } finally { setLoading(false) }
  }

  const importUrl = async (url: string) => {
    try {
      const r = await fetch('/api/recipes/import', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url }) })
      if (!r.ok) throw new Error(`Import failed: ${r.status}`)
      const json = await r.json()
      onImported(json?.data?.recipe)
    } catch (e) {
      alert((e as any)?.message || 'Import failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search the web (e.g., 'Sicilian caponata')" className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg" />
        <input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country (optional)" className="px-3 py-2 border border-gray-300 rounded-lg" />
        <button onClick={search} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">{loading ? 'Searching…' : 'Search'}</button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((r, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="font-medium text-gray-900 mb-1">{r.title || 'Result'}</div>
            <div className="text-xs text-gray-500 break-all mb-2">{r.url}</div>
            <div className="text-sm text-gray-700 line-clamp-3 mb-3">{r.content}</div>
            <div className="flex space-x-2">
              <a href={r.url} target="_blank" rel="noreferrer" className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">View</a>
              <button onClick={() => importUrl(r.url)} className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Import</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TavilySearch
