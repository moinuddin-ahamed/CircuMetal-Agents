/**
 * MongoDB Stage Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { StageRepository, StageRecord } from '../repositories'

interface MongoStageDocument extends MongoDocument {
    _id?: ObjectId
    scenario_id: number
    stage_order?: number | null
    stage_type?: string | null
    name: string
    description?: string | null
    created_at?: Date
    updated_at?: Date
}

const toStageRecord = (doc: MongoStageDocument | null): StageRecord | null => {
    if (!doc) return null
    return {
        stage_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        scenario_id: doc.scenario_id,
        stage_order: doc.stage_order || undefined,
        stage_type: doc.stage_type || undefined,
        name: doc.name,
        description: doc.description || undefined,
        created_at: doc.created_at?.toISOString(),
        updated_at: doc.updated_at?.toISOString(),
    }
}

export class MongoStageRepository implements StageRepository {
    async createStage(s: Partial<StageRecord>): Promise<StageRecord> {
        const collection = await getCollection(Collections.LIFECYCLE_STAGES)
        
        const doc: MongoStageDocument = {
            scenario_id: s.scenario_id!,
            stage_order: s.stage_order || null,
            stage_type: s.stage_type || null,
            name: s.name!,
            description: s.description || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toStageRecord({ ...doc, _id: result.insertedId })!
    }

    async listStagesByScenario(scenarioId: number): Promise<StageRecord[]> {
        const collection = await getCollection(Collections.LIFECYCLE_STAGES)
        
        const docs = await collection
            .find({ scenario_id: scenarioId })
            .sort({ stage_order: 1 })
            .toArray()
        
        return docs.map((doc: any) => toStageRecord(doc as MongoStageDocument)).filter((s: any) => s !== null) as StageRecord[]
    }

    async getStageById(stageId: number): Promise<StageRecord | null> {
        const collection = await getCollection(Collections.LIFECYCLE_STAGES)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === stageId) {
                    return toStageRecord(doc as unknown as MongoStageDocument)
                }
            }
        }
        return null
    }

    async updateStage(s: Partial<StageRecord> & { stage_id: number }): Promise<StageRecord | null> {
        const collection = await getCollection(Collections.LIFECYCLE_STAGES)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === s.stage_id) {
                    const updateFields: Partial<MongoStageDocument> = {
                        updated_at: new Date(),
                    }
                    if (s.name !== undefined) updateFields.name = s.name
                    if (s.stage_order !== undefined) updateFields.stage_order = s.stage_order || null
                    if (s.stage_type !== undefined) updateFields.stage_type = s.stage_type || null
                    if (s.description !== undefined) updateFields.description = s.description || null

                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateFields }
                    )
                    const updated = await collection.findOne({ _id: doc._id })
                    return toStageRecord(updated as unknown as MongoStageDocument)
                }
            }
        }
        return null
    }

    async deleteStage(stageId: number): Promise<boolean> {
        const collection = await getCollection(Collections.LIFECYCLE_STAGES)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === stageId) {
                    const result = await collection.deleteOne({ _id: doc._id })
                    return result.deletedCount > 0
                }
            }
        }
        return false
    }
}
