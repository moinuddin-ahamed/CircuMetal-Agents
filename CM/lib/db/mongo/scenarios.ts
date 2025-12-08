/**
 * MongoDB Scenario Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { ScenarioRepository, ScenarioRecord } from '../repositories'

interface MongoScenarioDocument extends MongoDocument {
    _id?: ObjectId
    user_id?: number | null
    project_id: number
    name: string
    route_type?: string | null
    is_baseline?: boolean | null
    status?: string | null
    description?: string | null
    created_at?: Date
    updated_at?: Date
}

const toScenarioRecord = (doc: MongoScenarioDocument | null): ScenarioRecord | null => {
    if (!doc) return null
    return {
        scenario_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        user_id: doc.user_id || undefined,
        project_id: doc.project_id,
        name: doc.name,
        route_type: doc.route_type || undefined,
        is_baseline: doc.is_baseline || false,
        status: doc.status || 'draft',
        description: doc.description || undefined,
        created_at: doc.created_at?.toISOString(),
    }
}

export class MongoScenarioRepository implements ScenarioRepository {
    async createScenario(s: Partial<ScenarioRecord>): Promise<ScenarioRecord> {
        const collection = await getCollection(Collections.SCENARIOS)
        
        const doc: MongoScenarioDocument = {
            user_id: s.user_id || null,
            project_id: s.project_id!,
            name: s.name!,
            route_type: s.route_type || null,
            is_baseline: s.is_baseline || false,
            status: s.status || 'draft',
            description: s.description || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toScenarioRecord({ ...doc, _id: result.insertedId })!
    }

    async getScenarioById(id: number): Promise<ScenarioRecord | null> {
        const collection = await getCollection(Collections.SCENARIOS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === id) {
                    return toScenarioRecord(doc as unknown as MongoScenarioDocument)
                }
            }
        }
        return null
    }

    async listScenariosByProject(projectId: number): Promise<ScenarioRecord[]> {
        const collection = await getCollection(Collections.SCENARIOS)
        
        const docs = await collection
            .find({ project_id: projectId })
            .sort({ created_at: -1 })
            .toArray()
        
        return docs.map((doc: any) => toScenarioRecord(doc as MongoScenarioDocument)).filter((s: any) => s !== null) as ScenarioRecord[]
    }

    async updateScenario(s: Partial<ScenarioRecord> & { scenario_id: number }): Promise<ScenarioRecord | null> {
        const collection = await getCollection(Collections.SCENARIOS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === s.scenario_id) {
                    const updateFields: Partial<MongoScenarioDocument> = {
                        updated_at: new Date(),
                    }
                    if (s.name !== undefined) updateFields.name = s.name
                    if (s.route_type !== undefined) updateFields.route_type = s.route_type || null
                    if (s.is_baseline !== undefined) updateFields.is_baseline = s.is_baseline
                    if (s.status !== undefined) updateFields.status = s.status || null
                    if (s.description !== undefined) updateFields.description = s.description || null

                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateFields }
                    )
                    const updated = await collection.findOne({ _id: doc._id })
                    return toScenarioRecord(updated as unknown as MongoScenarioDocument)
                }
            }
        }
        return null
    }

    async deleteScenario(id: number): Promise<boolean> {
        const collection = await getCollection(Collections.SCENARIOS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === id) {
                    const result = await collection.deleteOne({ _id: doc._id })
                    return result.deletedCount > 0
                }
            }
        }
        return false
    }
}
