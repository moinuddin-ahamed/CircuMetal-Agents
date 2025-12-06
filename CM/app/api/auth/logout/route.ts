import { NextResponse } from 'next/server'
import { logoutUser, clearSessionCookie } from '@/lib/auth-middleware'

export async function POST(req: Request) {
    try {
        await logoutUser()
        // cookie cleared by logoutUser
        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
