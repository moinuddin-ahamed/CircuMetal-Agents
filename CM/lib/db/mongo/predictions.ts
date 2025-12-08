/**
 * MongoDB Predictions Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { PredictionsRepository, PredictionRecord } from '../repositories'

interface MongoPredictionDocument extends MongoDocument {
    _id?: ObjectId
    user_id?: number | null
    scenario_id: number
    stage_id?: number | null
    request_type?: string | null
    input_data?: any
    output_data?: any
    model_name?: string | null
    model_version?: string | null
    confidence?: number | null
    status?: string | null
    error_message?: string | null
    created_at?: Date
    completed_at?: Date | null
}

const toPredictionRecord = (doc: MongoPredictionDocument | null): PredictionRecord | null => {
    if (!doc) return null
    return {
        prediction_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        scenario_id: doc.scenario_id,
        input: typeof doc.input_data === 'string' ? doc.input_data : JSON.stringify(doc.input_data || {}),
        output: typeof doc.output_data === 'string' ? doc.output_data : JSON.stringify(doc.output_data || {}),
        model_name: doc.model_name || undefined,
        model_version: doc.model_version || undefined,
        confidence: doc.confidence || undefined,
        created_at: doc.created_at?.toISOString(),
    }
}

export class MongoPredictionsRepository implements PredictionsRepository {
    async createPrediction(p: Partial<PredictionRecord>): Promise<PredictionRecord> {
        const collection = await getCollection(Collections.AI_PREDICTIONS)
        
        const doc: MongoPredictionDocument = {
            scenario_id: p.scenario_id!,
            input_data: p.input,
            output_data: p.output,
            model_name: p.model_name || null,
            model_version: p.model_version || null,
            confidence: p.confidence || null,
            status: 'completed',
            created_at: new Date(),
            completed_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toPredictionRecord({ ...doc, _id: result.insertedId })!
    }

    async listPredictionsByScenario(scenarioId: number): Promise<PredictionRecord[]> {
        const collection = await getCollection(Collections.AI_PREDICTIONS)
        
        const docs = await collection
            .find({ scenario_id: scenarioId })
            .sort({ _id: 1 })
            .toArray()
        
        return docs.map((doc: any) => toPredictionRecord(doc as MongoPredictionDocument)).filter((p: any) => p !== null) as PredictionRecord[]
    }

    async getPredictionById(predictionId: number): Promise<PredictionRecord | null> {
        const collection = await getCollection(Collections.AI_PREDICTIONS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === predictionId) {
                    return toPredictionRecord(doc as unknown as MongoPredictionDocument)
                }
            }
        }
        return null
    }

    async deletePrediction(predictionId: number): Promise<boolean> {
        const collection = await getCollection(Collections.AI_PREDICTIONS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === predictionId) {
                    const result = await collection.deleteOne({ _id: doc._id })
                    return result.deletedCount > 0
                }
            }
        }
        return false
    }
}
