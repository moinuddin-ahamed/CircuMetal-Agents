import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getCollection, Collections } from '@/lib/db/mongo/connection'
import { createPredictionsRepository } from '@/lib/db/factory'

export async function POST(req: Request) {
    try {
        const user = await requireAuth()
        const body = await req.json()
        const scenarioId = Number(body.scenarioId)
        if (!scenarioId) return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })

        // Find all stage parameters for the scenario that are null
        const stagesCollection = await getCollection(Collections.LIFECYCLE_STAGES)
        const paramsCollection = await getCollection(Collections.STAGE_PARAMETERS)
        const templatesCollection = await getCollection(Collections.PARAMETER_TEMPLATES)
        
        // Get stages for this scenario
        const stages = await stagesCollection.find({ scenario_id: scenarioId }).toArray()
        const stageIds = stages.map(s => s.stage_id)
        
        // Get parameters with null values for these stages
        const params = await paramsCollection.find({ 
            stage_id: { $in: stageIds },
            value: null 
        }).toArray()

        // Fetch all templates
        const templates = await templatesCollection.find({}).toArray()

        const updates: any[] = []

        for (const p of params) {
            // Get stage type for this parameter
            const stage = stages.find(s => s.stage_id === p.stage_id)
            if (!stage) continue

            // Find matching template
            const tmpl = templates.find(t => t.stage_type === stage.stage_type && t.parameter_name === p.parameter_name) 
                || templates.find(t => t.parameter_name === p.parameter_name)
            
            if (tmpl && tmpl.industry_default !== null) {
                // Update parameter with industry default
                await paramsCollection.updateOne(
                    { parameter_id: p.parameter_id },
                    { 
                        $set: {
                            value: tmpl.industry_default,
                            is_ai_predicted: true,
                            ai_model_name: 'gpt-placeholder',
                            ai_model_version: '1.0',
                            ai_confidence: 0.7,
                            source: 'ai_prediction',
                            updated_at: new Date()
                        }
                    }
                )
                updates.push({ parameter_id: p.parameter_id, value: tmpl.industry_default })
            }
        }

        // Log a simple ai_predictions entry
        const predictionsCollection = await getCollection(Collections.AI_PREDICTIONS)
        await predictionsCollection.insertOne({
            user_id: user.user_id,
            scenario_id: scenarioId,
            request_type: 'parameter_prediction',
            model_name: 'gpt-placeholder',
            model_version: '1.0',
            input_data: {},
            output_data: updates,
            confidence: 0.7,
            status: 'completed',
            created_at: new Date()
        })

        return NextResponse.json({ updated: updates.length, updates })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
