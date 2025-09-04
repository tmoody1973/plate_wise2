import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_GIT_SHA || ''
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.NEXT_PUBLIC_GIT_BRANCH || ''
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || ''
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || ''
  const region = process.env.VERCEL_REGION || ''

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    commit: {
      sha,
      short: sha ? sha.slice(0, 7) : '',
      branch,
      message,
    },
    runtime: {
      env,
      region,
    },
  })
}

