/**
 * MongoDB Results Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'
import type { ResultsRepository, EnvironmentalResultRecord, CircularityResultRecord } from '../repositories'

interface MongoEnvironmentalDocument extends MongoDocument {
    _id?: ObjectId
    scenario_id: number
    stage_id?: number | null
    indicator_type: string
    value: number
    unit?: string | null
    calculation_method?: string | null
    created_at?: Date
    updated_at?: Date
}

interface MongoCircularityDocument extends MongoDocument {
    _id?: ObjectId
    scenario_id: number
    metric_type: string
    value: number
    unit?: string | null
    calculation_method?: string | null
    details?: any
    created_at?: Date
    updated_at?: Date
}

const toEnvRecord = (doc: MongoEnvironmentalDocument | null): EnvironmentalResultRecord | null => {
    if (!doc) return null
    return {
        result_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        scenario_id: doc.scenario_id,
        stage_id: doc.stage_id || undefined,
        indicator_type: doc.indicator_type,
        value: Number(doc.value),
        unit: doc.unit || undefined,
        calculation_method: doc.calculation_method || undefined,
        created_at: doc.created_at?.toISOString(),
        updated_at: doc.updated_at?.toISOString(),
    }
}

const toCircRecord = (doc: MongoCircularityDocument | null): CircularityResultRecord | null => {
    if (!doc) return null
    return {
        result_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        scenario_id: doc.scenario_id,
        metric_type: doc.metric_type,
        value: Number(doc.value),
        unit: doc.unit || undefined,
        calculation_method: doc.calculation_method || undefined,
        details: doc.details,
        created_at: doc.created_at?.toISOString(),
        updated_at: doc.updated_at?.toISOString(),
    }
}

export class MongoResultsRepository implements ResultsRepository {
    async createEnvironmental(r: Partial<EnvironmentalResultRecord>): Promise<EnvironmentalResultRecord> {
        const collection = await getCollection(Collections.RESULTS_ENVIRONMENTAL)
        
        const doc: MongoEnvironmentalDocument = {
            scenario_id: r.scenario_id!,
            stage_id: r.stage_id || null,
            indicator_type: r.indicator_type!,
            value: r.value!,
            unit: r.unit || null,
            calculation_method: r.calculation_method || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toEnvRecord({ ...doc, _id: result.insertedId })!
    }

    async createCircularity(r: Partial<CircularityResultRecord>): Promise<CircularityResultRecord> {
        const collection = await getCollection(Collections.RESULTS_CIRCULARITY)
        
        const doc: MongoCircularityDocument = {
            scenario_id: r.scenario_id!,
            metric_type: r.metric_type!,
            value: r.value!,
            unit: r.unit || null,
            calculation_method: r.calculation_method || null,
            details: r.details || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toCircRecord({ ...doc, _id: result.insertedId })!
    }

    async listEnvironmentalByScenario(scenarioId: number): Promise<EnvironmentalResultRecord[]> {
        const collection = await getCollection(Collections.RESULTS_ENVIRONMENTAL)
        
        const docs = await collection
            .find({ scenario_id: scenarioId })
            .sort({ _id: 1 })
            .toArray()
        
        return docs.map((doc: any) => toEnvRecord(doc as MongoEnvironmentalDocument)).filter((r: any) => r !== null) as EnvironmentalResultRecord[]
    }

    async listCircularityByScenario(scenarioId: number): Promise<CircularityResultRecord[]> {
        const collection = await getCollection(Collections.RESULTS_CIRCULARITY)
        
        const docs = await collection
            .find({ scenario_id: scenarioId })
            .sort({ _id: 1 })
            .toArray()
        
        return docs.map((doc: any) => toCircRecord(doc as MongoCircularityDocument)).filter((r: any) => r !== null) as CircularityResultRecord[]
    }

    async deleteEnvironmentalByScenario(scenarioId: number): Promise<number> {
        const collection = await getCollection(Collections.RESULTS_ENVIRONMENTAL)
        const result = await collection.deleteMany({ scenario_id: scenarioId })
        return result.deletedCount
    }

    async deleteCircularityByScenario(scenarioId: number): Promise<number> {
        const collection = await getCollection(Collections.RESULTS_CIRCULARITY)
        const result = await collection.deleteMany({ scenario_id: scenarioId })
        return result.deletedCount
    }
}
