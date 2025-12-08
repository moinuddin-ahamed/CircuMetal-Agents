/**
 * Authentication utilities - bcrypt hashing, session management
 * 
 * This module provides MongoDB-based authentication functions.
 */
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { getCollection, Collections, toObjectId, fromObjectId } from './mongo/connection'

const SALT_ROUNDS = 12
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || '7')

// ============================================================================
// PASSWORD HASHING
// ============================================================================

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface Session {
    session_id: string
    user_id: string
    expires_at: Date
    created_at: Date
}

export async function createSession(userId: string): Promise<string> {
    const sessionId = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)

    const collection = await getCollection(Collections.SESSIONS)
    await collection.insertOne({
        session_id: sessionId,
        user_id: userId,
        expires_at: expiresAt,
        created_at: new Date()
    })

    return sessionId
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const collection = await getCollection(Collections.SESSIONS)
    const session = await collection.findOne({
        session_id: sessionId,
        expires_at: { $gt: new Date() }
    })
    if (!session) return null
    return {
        session_id: session.session_id,
        user_id: session.user_id,
        expires_at: session.expires_at,
        created_at: session.created_at
    }
}

export async function deleteSession(sessionId: string): Promise<void> {
    const collection = await getCollection(Collections.SESSIONS)
    await collection.deleteOne({ session_id: sessionId })
}

export async function deleteUserSessions(userId: string): Promise<void> {
    const collection = await getCollection(Collections.SESSIONS)
    await collection.deleteMany({ user_id: userId })
}

export async function cleanupExpiredSessions(): Promise<number> {
    const collection = await getCollection(Collections.SESSIONS)
    const result = await collection.deleteMany({ expires_at: { $lte: new Date() } })
    return result.deletedCount
}

// ============================================================================
// USER AUTHENTICATION
// ============================================================================

export interface User {
    user_id: string
    email: string
    password_hash: string
    name: string | null
    created_at: Date
    updated_at: Date
}

export async function createUser(
    email: string,
    password: string,
    name?: string | null
): Promise<User> {
    const passwordHash = await hashPassword(password)

    const collection = await getCollection(Collections.USERS)
    const now = new Date()
    const doc = {
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || null,
        created_at: now,
        updated_at: now
    }
    const result = await collection.insertOne(doc)
    return {
        user_id: fromObjectId(result.insertedId),
        email: doc.email,
        password_hash: doc.password_hash,
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
    }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const collection = await getCollection(Collections.USERS)
    const doc = await collection.findOne({ email: email.toLowerCase() })
    if (!doc) return null
    return {
        user_id: fromObjectId(doc._id),
        email: doc.email,
        password_hash: doc.password_hash,
        name: doc.name || null,
        created_at: doc.created_at,
        updated_at: doc.updated_at
    }
}

export async function getUserById(userId: string): Promise<User | null> {
    const collection = await getCollection(Collections.USERS)
    const doc = await collection.findOne({ _id: toObjectId(userId) })
    if (!doc) return null
    return {
        user_id: fromObjectId(doc._id),
        email: doc.email,
        password_hash: doc.password_hash,
        name: doc.name || null,
        created_at: doc.created_at,
        updated_at: doc.updated_at
    }
}

export async function authenticateUser(
    email: string,
    password: string
): Promise<User | null> {
    const user = await getUserByEmail(email)

    if (!user) {
        return null
    }

    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
        return null
    }

    return user
}

export async function updateUserProfile(
    userId: string,
    updates: { name?: string; email?: string }
): Promise<User> {
    const collection = await getCollection(Collections.USERS)
    const updateDoc: any = { updated_at: new Date() }
    if (updates.name !== undefined) updateDoc.name = updates.name
    if (updates.email !== undefined) updateDoc.email = updates.email.toLowerCase()
    
    const result = await collection.findOneAndUpdate(
        { _id: toObjectId(userId) },
        { $set: updateDoc },
        { returnDocument: 'after' }
    )
    
    if (!result) {
        throw new Error('User not found')
    }
    
    return {
        user_id: fromObjectId(result._id),
        email: result.email,
        password_hash: result.password_hash,
        name: result.name || null,
        created_at: result.created_at,
        updated_at: result.updated_at
    }
}
