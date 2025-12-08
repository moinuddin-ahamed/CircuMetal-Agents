/**
 * MongoDB Project Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { ProjectRepository, ProjectRecord } from '../repositories'

interface MongoProjectDocument extends MongoDocument {
    _id?: ObjectId
    user_id: number
    name: string
    description?: string | null
    metal_type?: string | null
    region?: string | null
    functional_unit?: string | null
    status?: string | null
    gwp?: number | null
    recycled_content?: number | null
    created_at?: Date
    updated_at?: Date
}

const toProjectRecord = (doc: MongoProjectDocument | null): ProjectRecord | null => {
    if (!doc) return null
    return {
        project_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        user_id: doc.user_id,
        name: doc.name,
        description: doc.description || undefined,
        metal_type: doc.metal_type || undefined,
        region: doc.region || undefined,
        functional_unit: doc.functional_unit || '1',
        status: doc.status || 'draft',
        gwp: doc.gwp || undefined,
        recycled_content: doc.recycled_content || undefined,
        created_at: doc.created_at?.toISOString(),
        updated_at: doc.updated_at?.toISOString(),
    }
}

export class MongoProjectRepository implements ProjectRepository {
    async createProject(p: Partial<ProjectRecord>): Promise<ProjectRecord> {
        console.log('MongoDB Repository createProject input:', { user_id: p.user_id, name: p.name, metal_type: p.metal_type, region: p.region, status: p.status })
        
        if (!p.user_id) throw new Error('user_id is required')
        if (!p.name) throw new Error('name is required')
        if (!p.metal_type) throw new Error('metal_type is required')
        if (!p.region) throw new Error('region is required')

        const collection = await getCollection(Collections.PROJECTS)
        
        const doc: MongoProjectDocument = {
            user_id: p.user_id,
            name: p.name,
            description: p.description || null,
            metal_type: p.metal_type,
            region: p.region,
            functional_unit: p.functional_unit || '1',
            status: p.status || 'draft',
            gwp: p.gwp || null,
            recycled_content: p.recycled_content || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        const insertedDoc = { ...doc, _id: result.insertedId }
        
        console.log('MongoDB Repository createProject result:', insertedDoc)
        return toProjectRecord(insertedDoc)!
    }

    async getProjectById(id: number): Promise<ProjectRecord | null> {
        const collection = await getCollection(Collections.PROJECTS)
        
        // Find by matching the numeric ID from ObjectId
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === id) {
                    return toProjectRecord(doc as unknown as MongoProjectDocument)
                }
            }
        }
        return null
    }

    async listProjectsByUser(userId: number): Promise<ProjectRecord[]> {
        const collection = await getCollection(Collections.PROJECTS)
        
        const docs = await collection
            .find({ user_id: userId })
            .sort({ created_at: -1 })
            .toArray()
        
        return docs.map(doc => toProjectRecord(doc as unknown as MongoProjectDocument)).filter(p => p !== null) as ProjectRecord[]
    }

    async updateProject(p: Partial<ProjectRecord> & { project_id: number }): Promise<ProjectRecord | null> {
        const collection = await getCollection(Collections.PROJECTS)
        
        // Find the project first
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === p.project_id) {
                    const updateFields: Partial<MongoProjectDocument> = {
                        updated_at: new Date(),
                    }
                    if (p.name !== undefined) updateFields.name = p.name
                    if (p.description !== undefined) updateFields.description = p.description || null
                    if (p.metal_type !== undefined) updateFields.metal_type = p.metal_type || null
                    if (p.region !== undefined) updateFields.region = p.region || null
                    if (p.status !== undefined) updateFields.status = p.status || null
                    if (p.functional_unit !== undefined) updateFields.functional_unit = p.functional_unit || null
                    if (p.gwp !== undefined) updateFields.gwp = p.gwp || null
                    if (p.recycled_content !== undefined) updateFields.recycled_content = p.recycled_content || null

                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateFields }
                    )
                    const updated = await collection.findOne({ _id: doc._id })
                    return toProjectRecord(updated as unknown as MongoProjectDocument)
                }
            }
        }
        return null
    }

    async deleteProject(id: number): Promise<boolean> {
        const collection = await getCollection(Collections.PROJECTS)
        
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
