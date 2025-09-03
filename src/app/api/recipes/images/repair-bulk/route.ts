import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Item = { source: string; title?: string; id?: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { items?: Item[] }
    const items = (body.items || []).filter(it => it && typeof it.source === 'string')
    if (!items.length) return NextResponse.json({ error: 'items required' }, { status: 400 })

    const endpoint = new URL('/api/recipes/repair-image', req.nextUrl).toString()
    const results: Array<{ source: string; ok: boolean; image_url?: string; error?: string }> = []

    // Process with limited concurrency
    const MAX_CONC = 4
    let idx = 0
    async function worker() {
      while (idx < items.length) {
        const my = items[idx++]
        if (!my) continue
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: my.source, title: my.title }),
          })
          const j = await res.json().catch(() => ({}))
          if (res.ok && j?.image_url) results.push({ source: my.source, ok: true, image_url: j.image_url })
          else results.push({ source: my.source, ok: false, error: j?.error || 'failed' })
        } catch (e: any) {
          results.push({ source: my.source, ok: false, error: e?.message || 'failed' })
        }
      }
    }

    const workers = Array.from({ length: Math.min(MAX_CONC, items.length) }, () => worker())
    await Promise.all(workers)

    const okCount = results.filter(r => r.ok).length
    return NextResponse.json({ ok: true, total: items.length, repaired: okCount, results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

