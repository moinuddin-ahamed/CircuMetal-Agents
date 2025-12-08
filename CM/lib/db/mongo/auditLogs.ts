/**
 * MongoDB Audit Logs Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'

interface MongoAuditLogDocument extends MongoDocument {
    _id?: ObjectId
    user_id: number
    entity_type?: string | null
    entity_id?: number | null
    action?: string | null
    details?: any
    created_at?: Date
}

interface AuditLogRecord {
    log_id?: number
    user_id: number
    entity_type?: string
    entity_id?: number
    action?: string
    details?: any
    created_at?: string
}

const toAuditLogRecord = (doc: MongoAuditLogDocument | null): AuditLogRecord | null => {
    if (!doc) return null
    return {
        log_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        user_id: doc.user_id,
        entity_type: doc.entity_type || undefined,
        entity_id: doc.entity_id || undefined,
        action: doc.action || undefined,
        details: doc.details,
        created_at: doc.created_at?.toISOString(),
    }
}

export class MongoAuditLogsRepository {
    async createLog(log: Partial<AuditLogRecord>): Promise<AuditLogRecord> {
        const collection = await getCollection(Collections.AUDIT_LOGS)
        
        const doc: MongoAuditLogDocument = {
            user_id: log.user_id!,
            entity_type: log.entity_type || null,
            entity_id: log.entity_id || null,
            action: log.action || null,
            details: log.details || null,
            created_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toAuditLogRecord({ ...doc, _id: result.insertedId })!
    }

    async listLogsByUser(userId: number, limit: number = 100): Promise<AuditLogRecord[]> {
        const collection = await getCollection(Collections.AUDIT_LOGS)
        
        const docs = await collection
            .find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(limit)
            .toArray()
        
        return docs.map((doc: any) => toAuditLogRecord(doc as MongoAuditLogDocument)).filter((l: any) => l !== null) as AuditLogRecord[]
    }

    async listLogsByEntity(entityType: string, entityId: number): Promise<AuditLogRecord[]> {
        const collection = await getCollection(Collections.AUDIT_LOGS)
        
        const docs = await collection
            .find({ entity_type: entityType, entity_id: entityId })
            .sort({ created_at: -1 })
            .toArray()
        
        return docs.map((doc: any) => toAuditLogRecord(doc as MongoAuditLogDocument)).filter((l: any) => l !== null) as AuditLogRecord[]
    }
}
