import { NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * GET /api/dashboard/summary
 * Fetches dashboard summary data from the Python backend
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const projectId = searchParams.get('project_id')
        const timeRangeDays = searchParams.get('time_range_days') || '30'

        const params = new URLSearchParams({
            time_range_days: timeRangeDays,
        })
        if (projectId) {
            params.set('project_id', projectId)
        }

        const response = await fetch(`${PYTHON_API_URL}/api/dashboard/summary?${params}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: error.detail || 'Failed to fetch dashboard summary' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Dashboard summary error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to fetch dashboard summary' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/dashboard/summary
 * Creates custom dashboard summary with specific parameters
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()

        const response = await fetch(`${PYTHON_API_URL}/api/dashboard/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: error.detail || 'Failed to create dashboard summary' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Dashboard summary POST error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to create dashboard summary' },
            { status: 500 }
        )
    }
}
