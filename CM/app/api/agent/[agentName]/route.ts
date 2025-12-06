import { NextResponse } from 'next/server'

const AGENT_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * Run a single agent with the provided input
 */
export async function POST(
    req: Request,
    { params }: { params: { agentName: string } }
) {
    try {
        const { agentName } = params
        const body = await req.json()

        const response = await fetch(`${AGENT_API_URL}/agents/${agentName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json(
                { error: error.detail || `Failed to run agent ${agentName}` },
                { status: response.status }
            )
        }

        const result = await response.json()
        return NextResponse.json(result)

    } catch (err: any) {
        console.error('Agent execution error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to run agent' },
            { status: 500 }
        )
    }
}

/**
 * Get information about a specific agent
 */
export async function GET(
    req: Request,
    { params }: { params: { agentName: string } }
) {
    try {
        const { agentName } = params

        const response = await fetch(`${AGENT_API_URL}/agents`)

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to get agents' },
                { status: response.status }
            )
        }

        const agents = await response.json()
        const agent = agents.agents.find((a: any) => a.name === agentName)

        if (!agent) {
            return NextResponse.json(
                { error: `Agent ${agentName} not found` },
                { status: 404 }
            )
        }

        return NextResponse.json(agent)

    } catch (err: any) {
        console.error('Get agent error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to get agent info' },
            { status: 500 }
        )
    }
}
