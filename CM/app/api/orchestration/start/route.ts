import { NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * POST /api/orchestration/start
 * Starts a full multi-agent LCA orchestration run
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { 
            process_description, 
            input_amount, 
            material, 
            energy_source, 
            location,
            project_id 
        } = body

        if (!process_description || !material) {
            return NextResponse.json(
                { error: 'process_description and material are required' },
                { status: 400 }
            )
        }

        const response = await fetch(`${PYTHON_API_URL}/api/orchestration/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                process_description,
                input_amount: input_amount || '1 ton',
                material,
                energy_source: energy_source || 'Grid Electricity',
                location: location || 'India',
                project_id
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: error.detail || 'Failed to start orchestration' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Orchestration start error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to start orchestration' },
            { status: 500 }
        )
    }
}
