import { NextResponse } from 'next/server'

const AGENT_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

export async function GET(
    req: Request,
    { params }: { params: { jobId: string } }
) {
    try {
        const { jobId } = params

        const response = await fetch(`${AGENT_API_URL}/api/analysis/${jobId}/status`)

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json(
                { error: error.detail || 'Failed to get status' },
                { status: response.status }
            )
        }

        const result = await response.json()
        return NextResponse.json(result)

    } catch (err: any) {
        console.error('Status check error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to check status' },
            { status: 500 }
        )
    }
}
