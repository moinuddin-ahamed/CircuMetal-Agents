import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getScenarioService } from '@/lib/services/lca-engine'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const scenarioId = Number(id)
        if (!scenarioId) return NextResponse.json({ error: 'scenario id required' }, { status: 400 })

        const service = getScenarioService()
        const result = await service.computeScenarioResults(scenarioId)

        return NextResponse.json({ result })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
