import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createProjectRepository } from '@/lib/db/factory'

const projectRepo = createProjectRepository()

export async function GET(req: Request) {
    try {
        const user = await requireAuth()
        const list = await projectRepo.listProjectsByUser(user.user_id)

        // Map DB records to a lightweight frontend shape
        const projects = list.map((p: any) => ({
            id: String(p.project_id),
            name: p.name || 'Untitled',
            metal: p.metal || '',
            region: p.region || '',
            status: p.status || 'draft',
            gwp: p.gwp || 0,
            recycledContent: p.recycled_content || 0,
            functionalUnit: p.functional_unit || '1 tonne',
            scenarios: [],
            createdAt: p.created_at,
            description: p.description || null,
            user_id: p.user_id,
        }))

        return NextResponse.json({ projects })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const user = await requireAuth()
        const body = await req.json()
        const { name, description, metal_type, region, functional_unit, status } = body

        console.log('POST /api/projects received:', { name, description, metal_type, region, functional_unit, status })

        if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
        if (!metal_type || metal_type === '') return NextResponse.json({ error: 'metal_type is required - received: ' + JSON.stringify(metal_type) }, { status: 400 })
        if (!region || region === '') return NextResponse.json({ error: 'region is required - received: ' + JSON.stringify(region) }, { status: 400 })

        const newProject = await projectRepo.createProject({
            user_id: user.user_id,
            name,
            description: description || null,
            metal_type,
            region,
            status: status || 'draft',
        } as any)

        const project = {
            id: String(newProject.project_id),
            name: newProject.name,
            metal: newProject.metal_type || '',
            region: newProject.region || '',
            status: newProject.status || 'draft',
            gwp: newProject.gwp || 0,
            recycledContent: newProject.recycled_content || 0,
            functionalUnit: newProject.functional_unit || '1 tonne',
            scenarios: [],
            createdAt: newProject.created_at,
            description: newProject.description || null,
            user_id: newProject.user_id,
        }

        return NextResponse.json({ project })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
