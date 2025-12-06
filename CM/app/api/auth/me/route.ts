import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-middleware'

export async function GET() {
  try {
    console.log(`[AUTH DEBUG] GET /api/auth/me: checking authentication`)
    const user = await getCurrentUser()
    if (!user) {
      console.log(`[AUTH DEBUG] GET /api/auth/me: user not authenticated, returning 401`)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    console.log(`[AUTH DEBUG] GET /api/auth/me: authenticated user email=${user.email}`)
    const { password_hash, ...safeUser } = user as any
    return NextResponse.json({ user: safeUser })
  } catch (err: any) {
    console.error(`[AUTH DEBUG] GET /api/auth/me: error`, err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
