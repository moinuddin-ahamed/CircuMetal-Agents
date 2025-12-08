// Authentication middleware and session utilities for Next.js
import { cookies } from 'next/headers'
import { getSession, deleteSession, type User } from '@/lib/db/auth'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_id'

/**
 * Get current user from session cookie
 */
export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

    console.log(`[AUTH DEBUG] getCurrentUser: sessionId from cookie = ${sessionId ? `"${sessionId.slice(0, 8)}..."` : "null"}`)

    if (!sessionId) {
        console.log(`[AUTH DEBUG] No session cookie found`)
        return null
    }

    const session = await getSession(sessionId)
    console.log(`[AUTH DEBUG] getSession result: ${session ? `user_id=${session.user_id}, expires_at=${session.expires_at}` : "null (expired or not found)"}`)

    if (!session) {
        console.log(`[AUTH DEBUG] Session not found or expired`)
        return null
    }

    // Session is valid, import here to avoid circular deps
    const { getUserById } = await import('@/lib/db/auth')
    const user = await getUserById(session.user_id)
    console.log(`[AUTH DEBUG] getUserById result: ${user ? `email=${user.email}` : "null"}`)
    return user
}

/**
 * Get current user ID (for protected routes)
 */
export async function getCurrentUserId(): Promise<number | string | null> {
    const user = await getCurrentUser()
    return user?.user_id || null
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<User> {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Unauthorized - user not authenticated')
    }

    return user
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionId: string): Promise<void> {
    const cookieStore = await cookies()
    const expiresIn = parseInt(process.env.SESSION_TTL_DAYS || '7')

    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresIn * 24 * 60 * 60, // days to seconds
        path: '/',
    })
}

/**
 * Clear session cookie (logout)
 */
export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (sessionId) {
        await deleteSession(sessionId)
    }

    await clearSessionCookie()
}
