/**
 * MongoDB User Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { UserRepository, UserRecord } from '../repositories'

interface MongoUserDocument extends MongoDocument {
    _id?: ObjectId
    email: string
    password_hash?: string | null
    name?: string | null
    created_at?: Date
    updated_at?: Date
}

const toUserRecord = (doc: MongoUserDocument | null): UserRecord | null => {
    if (!doc) return null
    return {
        user_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        email: doc.email,
        password_hash: doc.password_hash || undefined,
        name: doc.name || undefined,
        created_at: doc.created_at?.toISOString(),
    }
}

export class MongoUserRepository implements UserRepository {
    async createUser(u: Partial<UserRecord>): Promise<UserRecord> {
        const collection = await getCollection<MongoUserDocument>(Collections.USERS)
        
        const doc: MongoUserDocument = {
            email: u.email!,
            password_hash: u.password_hash || null,
            name: u.name || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        
        return {
            ...toUserRecord({ ...doc, _id: result.insertedId })!,
        }
    }

    async getUserByEmail(email: string): Promise<UserRecord | null> {
        const collection = await getCollection<MongoUserDocument>(Collections.USERS)
        const doc = await collection.findOne({ email })
        return toUserRecord(doc)
    }

    async getUserById(id: number): Promise<UserRecord | null> {
        const collection = await getCollection<MongoUserDocument>(Collections.USERS)
        // Try to find by the numeric ID stored in the last 8 hex chars of ObjectId
        // Or find by querying all and matching
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === id) {
                    return toUserRecord(doc)
                }
            }
        }
        return null
    }

    async updateUser(u: Partial<UserRecord> & { user_id: number }): Promise<UserRecord | null> {
        const collection = await getCollection<MongoUserDocument>(Collections.USERS)
        
        // Find the user first
        const existingUser = await this.getUserById(u.user_id)
        if (!existingUser) return null

        const updateFields: Partial<MongoUserDocument> = {
            updated_at: new Date(),
        }
        if (u.name !== undefined) updateFields.name = u.name || null
        if (u.email !== undefined) updateFields.email = u.email

        // Find and update
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === u.user_id) {
                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateFields }
                    )
                    const updated = await collection.findOne({ _id: doc._id })
                    return toUserRecord(updated)
                }
            }
        }
        return null
    }
}
