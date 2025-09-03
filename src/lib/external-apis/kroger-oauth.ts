/**
 * Server-only Kroger OAuth helper with in-memory token cache.
 */

let cachedToken: { accessToken: string; expiresAt: number } | null = null

export async function getKrogerAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken
  }

  const clientId = process.env.KROGER_CLIENT_ID
  const clientSecret = process.env.KROGER_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Missing Kroger client credentials')

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'product.compact',
  })

  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body,
    // @ts-ignore next
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Kroger OAuth failed: ${res.status}`)
  }

  const data = await res.json()
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 1800_000),
  }
  return cachedToken.accessToken
}

