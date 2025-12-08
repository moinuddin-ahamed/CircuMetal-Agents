import { NextRequest, NextResponse } from 'next/server'

const AGENT_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * Get reference data from the agents backend
 * Supports: emission-factors, circularity-benchmarks, material-properties, process-templates
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ type: string }> }
) {
    try {
        const { type } = await params

        const validTypes = [
            'emission-factors',
            'circularity-benchmarks',
            'material-properties',
            'process-templates'
        ]

        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid data type. Valid types: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        const response = await fetch(`${AGENT_API_URL}/api/data/${type}`)

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: error.detail || `Failed to get ${type}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (err: any) {
        console.error('Get reference data error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to get reference data' },
            { status: 500 }
        )
    }
}
