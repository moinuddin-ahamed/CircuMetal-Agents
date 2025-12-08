import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * GET /api/orchestration/[runId]/result
 * Gets the final result of an orchestration run
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    try {
        const { runId } = await params

        const response = await fetch(`${PYTHON_API_URL}/api/orchestration/${runId}/result`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: error.detail || 'Failed to get orchestration result' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Orchestration result error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to get orchestration result' },
            { status: 500 }
        )
    }
}
