import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createScenarioRepository, createStageRepository, createStageParametersRepository } from '@/lib/db/factory'

const scenarioRepo = createScenarioRepository()
const stageRepo = createStageRepository()
const paramRepo = createStageParametersRepository()

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const numId = Number(id)
        const scenario = await scenarioRepo.getScenarioById(numId)
        if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        // Simple ownership check
        if (scenario.user_id !== user.user_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

        const stages = await stageRepo.listStagesByScenario(numId)
        const paramsList = await paramRepo.listParametersByScenario(numId)

        return NextResponse.json({ scenario, stages, parameters: paramsList })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const numId = Number(id)
        const body = await req.json()

        // Ensure the scenario belongs to the user before updating
        const existing = await scenarioRepo.getScenarioById(numId)
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (existing.user_id !== user.user_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

        // Only allow updating metadata (name, status, description, is_baseline)
        const updated = await scenarioRepo.updateScenario({
            scenario_id: numId,
            name: body.name,
            status: body.status,
            description: body.description,
            is_baseline: body.is_baseline,
        } as any)

        return NextResponse.json({ scenario: updated })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const numId = Number(id)
        // Ensure ownership before delete
        const existing = await scenarioRepo.getScenarioById(numId)
        if (!existing || existing.user_id !== user.user_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        const ok = await scenarioRepo.deleteScenario(numId)
        return NextResponse.json({ ok })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
