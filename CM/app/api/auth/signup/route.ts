import { NextResponse } from 'next/server'
import { createUser, createSession, getUserByEmail } from '@/lib/db/auth'
import { setSessionCookie } from '@/lib/auth-middleware'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { email, password, name } = body
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const existing = await getUserByEmail(email)
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 })
        }

        const user = await createUser(email.toLowerCase(), password, name || null)
        const sessionId = await createSession(user.user_id)

        // set cookie using server-side cookie helper
        await setSessionCookie(sessionId)

        // don't return password hash
        const { password_hash, ...safeUser } = user as any

        return NextResponse.json({ user: safeUser })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
