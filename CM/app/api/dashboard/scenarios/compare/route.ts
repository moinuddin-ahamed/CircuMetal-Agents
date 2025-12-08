import { NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * POST /api/dashboard/scenarios/compare
 * Compares multiple LCA scenarios
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { scenario_ids, metrics } = body

        if (!scenario_ids || !Array.isArray(scenario_ids) || scenario_ids.length < 2) {
            return NextResponse.json(
                { error: 'At least 2 scenario_ids are required for comparison' },
                { status: 400 }
            )
        }

        const response = await fetch(`${PYTHON_API_URL}/api/dashboard/scenarios/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scenario_ids,
                metrics: metrics || ['gwp', 'energy', 'water', 'circularity']
            }),
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: error.detail || 'Failed to compare scenarios' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Scenario comparison error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to compare scenarios' },
            { status: 500 }
        )
    }
}
