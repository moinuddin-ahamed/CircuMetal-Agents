import { NextResponse } from 'next/server'

const AGENT_API_URL = process.env.CIRCUMETAL_AGENT_API_URL || 'http://localhost:8000'

/**
 * Get list of all available agents
 */
export async function GET() {
    try {
        const response = await fetch(`${AGENT_API_URL}/health`)

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to get agents' },
                { status: response.status }
            )
        }

        const health = await response.json()

        // Transform agents array to include descriptions
        const agentDescriptions: Record<string, string> = {
            'DataAgent': 'Extracts and structures process data from descriptions',
            'EstimationAgent': 'Estimates missing parameters using AI/ML and reference data',
            'LCAAgent': 'Calculates life cycle assessment metrics (GWP, energy, etc.)',
            'CircularityAgent': 'Assesses circularity indicators and MCI score',
            'ScenarioAgent': 'Generates improvement scenarios and comparisons',
            'VisualizationAgent': 'Creates Sankey diagrams and charts',
            'ExplainAgent': 'Generates comprehensive reports with recommendations',
            'ComplianceAgent': 'Checks ISO 14040/14044/14067 compliance',
            'CritiqueAgent': 'Reviews and validates the entire analysis'
        }

        const agents = health.agents.map((name: string) => ({
            name,
            description: agentDescriptions[name] || 'CircuMetal AI Agent',
            available: true
        }))

        return NextResponse.json({
            agents,
            active_jobs: health.active_jobs
        })

    } catch (err: any) {
        console.error('Get agents error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to get agents' },
            { status: 500 }
        )
    }
}
