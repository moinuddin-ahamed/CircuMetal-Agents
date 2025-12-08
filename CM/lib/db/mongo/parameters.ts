/**
 * MongoDB Parameter Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { ParameterRepository, ParameterRecord } from '../repositories'

interface MongoParameterDocument extends MongoDocument {
    _id?: ObjectId
    stage_id: number
    parameter_name: string
    parameter_type?: string | null
    unit?: string | null
    value?: number | string | null
    is_ai_predicted?: boolean | null
    ai_model_name?: string | null
    ai_model_version?: string | null
    ai_confidence?: number | null
    source?: string | null
    created_at?: Date
    updated_at?: Date
}

const toParameterRecord = (doc: MongoParameterDocument | null): ParameterRecord | null => {
    if (!doc) return null
    return {
        parameter_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        stage_id: doc.stage_id,
        parameter_name: doc.parameter_name,
        parameter_type: doc.parameter_type || undefined,
        unit: doc.unit || undefined,
        value: doc.value || undefined,
        is_ai_predicted: doc.is_ai_predicted || false,
        ai_model_name: doc.ai_model_name || undefined,
        ai_model_version: doc.ai_model_version || undefined,
        ai_confidence: doc.ai_confidence || undefined,
        source: doc.source || undefined,
        created_at: doc.created_at?.toISOString(),
        updated_at: doc.updated_at?.toISOString(),
    }
}

export class MongoParameterRepository implements ParameterRepository {
    async createParameter(p: Partial<ParameterRecord>): Promise<ParameterRecord> {
        const collection = await getCollection(Collections.STAGE_PARAMETERS)
        
        const doc: MongoParameterDocument = {
            stage_id: p.stage_id!,
            parameter_name: p.parameter_name!,
            parameter_type: p.parameter_type || null,
            unit: p.unit || null,
            value: p.value || null,
            source: p.source || null,
            is_ai_predicted: p.is_ai_predicted || false,
            ai_model_name: p.ai_model_name || null,
            ai_model_version: p.ai_model_version || null,
            ai_confidence: p.ai_confidence || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toParameterRecord({ ...doc, _id: result.insertedId })!
    }

    async listParametersByStage(stageId: number): Promise<ParameterRecord[]> {
        const collection = await getCollection(Collections.STAGE_PARAMETERS)
        
        const docs = await collection
            .find({ stage_id: stageId })
            .sort({ _id: 1 })
            .toArray()
        
        return docs.map((doc: any) => toParameterRecord(doc as MongoParameterDocument)).filter((p: any) => p !== null) as ParameterRecord[]
    }

    async listParametersByScenario(scenarioId: number): Promise<ParameterRecord[]> {
        const stagesCollection = await getCollection(Collections.LIFECYCLE_STAGES)
        const paramsCollection = await getCollection(Collections.STAGE_PARAMETERS)
        
        // Get all stages for the scenario
        const stages = await stagesCollection
            .find({ scenario_id: scenarioId })
            .sort({ stage_order: 1 })
            .toArray()
        
        // Get stage IDs
        const stageIds = stages.map((s: any) => {
            if (s._id) {
                return parseInt(fromObjectId(s._id).slice(-8), 16)
            }
            return null
        }).filter((id: any) => id !== null)
        
        if (stageIds.length === 0) return []
        
        // Get all parameters for these stages
        const allParams: ParameterRecord[] = []
        for (const stageId of stageIds) {
            const params = await this.listParametersByStage(stageId as number)
            allParams.push(...params)
        }
        
        return allParams
    }

    async updateParameter(p: Partial<ParameterRecord> & { parameter_id: number }): Promise<ParameterRecord | null> {
        const collection = await getCollection(Collections.STAGE_PARAMETERS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === p.parameter_id) {
                    const updateFields: Partial<MongoParameterDocument> = {
                        updated_at: new Date(),
                    }
                    if (p.value !== undefined) updateFields.value = p.value || null
                    if (p.unit !== undefined) updateFields.unit = p.unit || null
                    if (p.source !== undefined) updateFields.source = p.source || null
                    if (p.is_ai_predicted !== undefined) updateFields.is_ai_predicted = p.is_ai_predicted || false
                    if (p.ai_model_name !== undefined) updateFields.ai_model_name = p.ai_model_name || null
                    if (p.ai_model_version !== undefined) updateFields.ai_model_version = p.ai_model_version || null
                    if (p.ai_confidence !== undefined) updateFields.ai_confidence = p.ai_confidence || null

                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateFields }
                    )
                    const updated = await collection.findOne({ _id: doc._id })
                    return toParameterRecord(updated as unknown as MongoParameterDocument)
                }
            }
        }
        return null
    }

    async getIncompleteParameters(scenarioId: number): Promise<ParameterRecord[]> {
        const allParams = await this.listParametersByScenario(scenarioId)
        return allParams.filter(p => p.value === null || p.value === undefined)
    }

    async getParameterById(parameterId: number): Promise<ParameterRecord | null> {
        const collection = await getCollection(Collections.STAGE_PARAMETERS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === parameterId) {
                    return toParameterRecord(doc as unknown as MongoParameterDocument)
                }
            }
        }
        return null
    }

    async deleteParameter(parameterId: number): Promise<boolean> {
        const collection = await getCollection(Collections.STAGE_PARAMETERS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === parameterId) {
                    const result = await collection.deleteOne({ _id: doc._id })
                    return result.deletedCount > 0
                }
            }
        }
        return false
    }
}
