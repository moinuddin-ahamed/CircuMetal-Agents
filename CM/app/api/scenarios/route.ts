import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createScenarioRepository, createProjectRepository } from '@/lib/db/factory'
import { getScenarioService } from '@/lib/services/lca-engine'

const scenarioRepo = createScenarioRepository()
const scenarioService = getScenarioService()

export async function GET(req: Request) {
    try {
        const user = await requireAuth()
        const url = new URL(req.url)
        const projectId = url.searchParams.get('projectId')

        if (!projectId) {
            return NextResponse.json({ error: 'projectId query parameter required' }, { status: 400 })
        }

        // Ensure the project belongs to the authenticated user
        const projectRepo = createProjectRepository()
        const project = await projectRepo.getProjectById(Number(projectId))
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        if (project.user_id !== user.user_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

        const list = await scenarioRepo.listScenariosByProject(Number(projectId))
        return NextResponse.json({ scenarios: list })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const user = await requireAuth()
        const body = await req.json()
        const { project_id, name, route_type, is_baseline, description } = body

        if (!project_id || !name || !route_type) {
            return NextResponse.json({ error: 'project_id, name and route_type are required' }, { status: 400 })
        }

        // Ensure the target project belongs to the user
        const projectRepo = createProjectRepository()
        const project = await projectRepo.getProjectById(Number(project_id))
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        if (project.user_id !== user.user_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

        const newScenario = await scenarioRepo.createScenario({
            user_id: user.user_id,
            project_id: Number(project_id),
            name,
            route_type,
            is_baseline: !!is_baseline,
            description: description || null,
        })

        // Auto-generate stages and parameter placeholders
        if (!newScenario.scenario_id) {
            throw new Error('Failed to create scenario - no scenario_id returned')
        }
        await scenarioService.generateStagesFromTemplate(newScenario.scenario_id, route_type)
        const stages = await scenarioService.generateStagesFromTemplate(newScenario.scenario_id, route_type)

        for (const stage of stages) {
            if (!stage.stage_id) {
                throw new Error('Failed to generate stage - no stage_id returned')
            }
            await scenarioService.generateParameterPlaceholders(stage.stage_id)
        }

        return NextResponse.json({ scenario: newScenario })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
