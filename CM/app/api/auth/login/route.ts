import { NextResponse } from 'next/server'
import { authenticateUser, createSession } from '@/lib/db/auth'
import { setSessionCookie } from '@/lib/auth-middleware'

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()
        if (!email || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })

        const user = await authenticateUser(email.toLowerCase(), password)
        if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

        const sessionId = await createSession(user.user_id)
        await setSessionCookie(sessionId)

        const { password_hash, ...safeUser } = user as any
        return NextResponse.json({ user: safeUser })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
