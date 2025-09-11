import { NextRequest, NextResponse } from 'next/server'

// Proxy route that forwards Suggestions requests to an n8n Webhook
// It preserves the same response contract as /api/meal-plans/recipes-only

const DEFAULT_TIMEOUT_MS = 25000

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const secret = process.env.N8N_WEBHOOK_SECRET

  if (!webhookUrl) {
    return NextResponse.json({
      success: false,
      error: 'N8N_WEBHOOK_URL is not set. Configure it in your server env.'
    }, { status: 503 })
  }

  try {
    const body = await req.json()

    // Build a safe request with timeout
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-N8N-SECRET': secret } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    } as RequestInit).finally(() => clearTimeout(t))

    // Pass through JSON on success
    if (res.ok) {
      const json = await res.json().catch(() => null)
      if (json && typeof json === 'object') {
        return NextResponse.json(json)
      }
      // If n8n returned non‑JSON body, wrap a friendly error
      const text = await res.text().catch(() => '')
      return NextResponse.json({
        success: false,
        error: 'n8n responded with a non‑JSON body',
        details: text?.slice(0, 500)
      }, { status: 502 })
    }

    // Error from n8n – surface minimal info and a friendly fallback
    const errText = await res.text().catch(() => '')
    return NextResponse.json({
      success: true,
      message: 'No matches for filters (n8n error)',
      data: {
        recipes: [],
        reasons: [
          `n8n returned ${res.status} – please try again or switch provider`,
        ],
        relaxers: [
          { key: 'allow_60_min', label: 'Allow 45–60 min', patch: { maxPrepTime: 60 } },
          { key: 'include_sides', label: 'Include sides', patch: { categoriesAppend: ['side'] } },
        ],
        summary: { totalRecipes: 0, provider: 'n8n', http_status: res.status }
      },
      details: errText?.slice(0, 500),
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (err: any) {
    const isAbort = err?.name === 'AbortError'
    return NextResponse.json({
      success: true,
      message: isAbort ? 'n8n timed out' : 'n8n unavailable',
      data: {
        recipes: [],
        reasons: [isAbort ? 'The n8n workflow exceeded the timeout.' : 'Unable to reach n8n webhook.'],
        relaxers: [
          { key: 'allow_60_min', label: 'Allow 45–60 min', patch: { maxPrepTime: 60 } },
          { key: 'include_sides', label: 'Include sides', patch: { categoriesAppend: ['side'] } },
        ],
        summary: { totalRecipes: 0, provider: 'n8n' }
      },
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
}

