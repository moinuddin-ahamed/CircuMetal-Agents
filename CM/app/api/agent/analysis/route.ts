import { NextResponse } from 'next/server'

const AGENT_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { 
            process_description, 
            input_amount, 
            material, 
            energy_source, 
            location,
            project_id,
            scenario_id 
        } = body

        if (!process_description || !material) {
            return NextResponse.json(
                { error: 'process_description and material are required' },
                { status: 400 }
            )
        }

        // Forward to Python agent API
        const response = await fetch(`${AGENT_API_URL}/api/analysis/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                process_description,
                input_amount: input_amount || '1 ton',
                material,
                energy_source: energy_source || 'Grid Electricity',
                location: location || 'Europe',
                project_id,
                scenario_id
            })
        })

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json(
                { error: error.detail || 'Agent API error' },
                { status: response.status }
            )
        }

        const result = await response.json()
        return NextResponse.json(result)

    } catch (err: any) {
        console.error('Analysis start error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to start analysis' },
            { status: 500 }
        )
    }
}
