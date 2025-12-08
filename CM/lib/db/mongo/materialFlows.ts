/**
 * MongoDB Material Flows Repository
 */

import { ObjectId, Document as MongoDocument } from 'mongodb'
import { getCollection, Collections, fromObjectId } from './connection'

interface MongoMaterialFlowDocument extends MongoDocument {
    _id?: ObjectId
    scenario_id: number
    from_stage_id?: number | null
    to_stage_id?: number | null
    material_type?: string | null
    quantity_tonnes?: number | null
    percentage?: number | null
    created_at?: Date
    updated_at?: Date
}

interface MaterialFlowRecord {
    flow_id?: number
    scenario_id: number
    from_stage_id?: number
    to_stage_id?: number
    material_type?: string
    quantity_tonnes?: number
    percentage?: number
    created_at?: string
    updated_at?: string
}

const toMaterialFlowRecord = (doc: MongoMaterialFlowDocument | null): MaterialFlowRecord | null => {
    if (!doc) return null
    return {
        flow_id: doc._id ? parseInt(fromObjectId(doc._id).slice(-8), 16) : undefined,
        scenario_id: doc.scenario_id,
        from_stage_id: doc.from_stage_id || undefined,
        to_stage_id: doc.to_stage_id || undefined,
        material_type: doc.material_type || undefined,
        quantity_tonnes: doc.quantity_tonnes || undefined,
        percentage: doc.percentage || undefined,
        created_at: doc.created_at?.toISOString(),
        updated_at: doc.updated_at?.toISOString(),
    }
}

export class MongoMaterialFlowsRepository {
    async createFlow(flow: Partial<MaterialFlowRecord>): Promise<MaterialFlowRecord> {
        const collection = await getCollection(Collections.MATERIAL_FLOWS)
        
        const doc: MongoMaterialFlowDocument = {
            scenario_id: flow.scenario_id!,
            from_stage_id: flow.from_stage_id || null,
            to_stage_id: flow.to_stage_id || null,
            material_type: flow.material_type || null,
            quantity_tonnes: flow.quantity_tonnes || null,
            percentage: flow.percentage || null,
            created_at: new Date(),
            updated_at: new Date(),
        }
        
        const result = await collection.insertOne(doc as any)
        return toMaterialFlowRecord({ ...doc, _id: result.insertedId })!
    }

    async listFlowsByScenario(scenarioId: number): Promise<MaterialFlowRecord[]> {
        const collection = await getCollection(Collections.MATERIAL_FLOWS)
        
        const docs = await collection
            .find({ scenario_id: scenarioId })
            .sort({ _id: 1 })
            .toArray()
        
        return docs.map((doc: any) => toMaterialFlowRecord(doc as MongoMaterialFlowDocument)).filter((f: any) => f !== null) as MaterialFlowRecord[]
    }

    async deleteFlowsByScenario(scenarioId: number): Promise<number> {
        const collection = await getCollection(Collections.MATERIAL_FLOWS)
        const result = await collection.deleteMany({ scenario_id: scenarioId })
        return result.deletedCount
    }

    async updateFlow(flow: Partial<MaterialFlowRecord> & { flow_id: number }): Promise<MaterialFlowRecord | null> {
        const collection = await getCollection(Collections.MATERIAL_FLOWS)
        
        const docs = await collection.find({}).toArray()
        for (const doc of docs) {
            if (doc._id) {
                const numericId = parseInt(fromObjectId(doc._id).slice(-8), 16)
                if (numericId === flow.flow_id) {
                    const updateFields: Partial<MongoMaterialFlowDocument> = {
                        updated_at: new Date(),
                    }
                    if (flow.from_stage_id !== undefined) updateFields.from_stage_id = flow.from_stage_id || null
                    if (flow.to_stage_id !== undefined) updateFields.to_stage_id = flow.to_stage_id || null
                    if (flow.material_type !== undefined) updateFields.material_type = flow.material_type || null
                    if (flow.quantity_tonnes !== undefined) updateFields.quantity_tonnes = flow.quantity_tonnes || null
                    if (flow.percentage !== undefined) updateFields.percentage = flow.percentage || null

                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: updateFields }
                    )
                    const updated = await collection.findOne({ _id: doc._id })
                    return toMaterialFlowRecord(updated as unknown as MongoMaterialFlowDocument)
                }
            }
        }
        return null
    }
}
