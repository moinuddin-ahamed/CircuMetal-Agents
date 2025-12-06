import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createStageParametersRepository, createStageRepository, createScenarioRepository } from '@/lib/db/factory'

const paramRepo = createStageParametersRepository()

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const numId = Number(id)
        const body = await req.json()

        // Ensure parameter exists and belongs to current user's scenario
        const existing = await paramRepo.getParameterById(numId)
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const stageRepo = createStageRepository()
        const scenarioRepo = createScenarioRepository()
        const stage = await stageRepo.getStageById(existing.stage_id)
        if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

        const scenario = await scenarioRepo.getScenarioById(stage.scenario_id)
        if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
        if (scenario.user_id !== user.user_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

        const updated = await paramRepo.updateParameter({
            parameter_id: numId,
            value: body.value,
            source: 'manual',
            is_ai_predicted: false,
            ai_confidence: null,
            ai_model_name: null,
            ai_model_version: null,
        } as any)

        return NextResponse.json({ parameter: updated })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
