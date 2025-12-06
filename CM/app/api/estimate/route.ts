import { NextResponse } from 'next/server'

const AGENT_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

interface EstimateRequest {
    material: string
    process_type: 'primary' | 'secondary' | 'hybrid'
    region: string
    parameters_needed?: string[]
}

/**
 * Quick parameter estimation endpoint
 * 
 * Uses the EstimationAgent to provide emission factors and circularity indicators
 * without running the full analysis pipeline.
 */
export async function POST(req: Request) {
    try {
        const body: EstimateRequest = await req.json()

        const { material, process_type, region } = body

        if (!material || !process_type || !region) {
            return NextResponse.json(
                { error: 'material, process_type, and region are required' },
                { status: 400 }
            )
        }

        const response = await fetch(`${AGENT_API_URL}/api/estimate/parameters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                material,
                process_type,
                region,
                parameters_needed: body.parameters_needed || []
            })
        })

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json(
                { error: error.detail || 'Failed to estimate parameters' },
                { status: response.status }
            )
        }

        const result = await response.json()
        return NextResponse.json(result)

    } catch (err: any) {
        console.error('Estimation error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to estimate parameters' },
            { status: 500 }
        )
    }
}
