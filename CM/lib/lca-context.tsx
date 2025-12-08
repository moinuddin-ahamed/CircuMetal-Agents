"use client"

import type React from "react"
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react"

export interface Parameter {
  name: string
  value: string
  unit: string
  source: "user_input" | "ai_predicted" | "db_default"
  confidence?: "High" | "Medium" | "Low"
}

export interface Stage {
  id: string
  name: string
  type: string
  icon: string
  dataComplete: number
  parameters: Parameter[]
}

export interface Scenario {
  id: string
  name: string
  projectId: string
  metalType: string
  productType: string
  region: string
  route: string
  isBaseline: boolean
  status: "draft" | "completed"
  stages: Stage[]
  results?: {
    gwp: number
    energy: number
    water: number
    waste: number
    recycledContent: number
    recoveryRate: number
  }
}

export interface Project {
  id: string
  name: string
  metal: string
  region: string
  status: "draft" | "in-progress" | "completed"
  gwp: number
  recycledContent: number
  functionalUnit: string
  scenarios: Scenario[]
  createdAt: Date
}

interface LCAContextType {
  projects: Project[]
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  currentScenario: Scenario | null
  setCurrentScenario: (scenario: Scenario | null) => void
  currentView:
  | "dashboard"
  | "projects"
  | "project-detail"
  | "project-management"
  | "inventory-management"
  | "lca-reports"
  | "new-assessment"
  | "inventory"
  | "run-results"
  | "scenario"
  | "results"
  | "comparison"
  | "reports"
  | "agents"
  | "settings"
  | "help"
  setCurrentView: (
    view:
      | "dashboard"
      | "projects"
      | "project-detail"
      | "project-management"
      | "inventory-management"
      | "lca-reports"
      | "new-assessment"
      | "inventory"
      | "run-results"
      | "scenario"
      | "results"
      | "comparison"
      | "reports"
      | "agents"
      | "settings"
      | "help",
  ) => void
  isAuthenticated: boolean
  setIsAuthenticated: (authenticated: boolean) => void
  addProject: (project: Project) => void
  updateProject: (id: string, project: Partial<Project>) => void
  addScenario: (projectId: string, scenario: Scenario) => void
  updateScenario: (projectId: string, scenarioId: string, scenario: Partial<Scenario>) => void
  updateStageParameter: (projectId: string, scenarioId: string, stageId: string, param: Parameter) => void
  runAssessment: (projectId: string, scenarioId: string) => void
}

const LCAContext = createContext<LCAContextType | undefined>(undefined)

export function LCAProvider({ children }: { children: React.ReactNode }) {
  // Load projects from server (real-time via polling). Start with empty array.
  const [projects, setProjects] = useState<Project[]>([])
  const [pollIntervalMs] = useState<number>(10000) // poll every 10s

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { credentials: 'same-origin' })
      if (res.status === 401) {
        setIsAuthenticated(false)
        setProjects([])
        return
      }
      if (!res.ok) return
      const data = await res.json()
      if (data?.projects) {
        // map server shape to frontend Project shape
        const mapped = data.projects.map((p: any) => ({
          id: String(p.id),
          name: p.name || 'Untitled',
          metal: p.metal || '',
          region: p.region || '',
          status: p.status || 'draft',
          gwp: p.gwp || 0,
          recycledContent: p.recycledContent || 0,
          functionalUnit: p.functionalUnit || '1 tonne',
          scenarios: p.scenarios || [],
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        }))
        setProjects(mapped)
      }
    } catch (e) {
      // ignore for now
    }
  }, [])

  useEffect(() => {
    // initial auth check then load projects (start polling only when authenticated)
    let id: NodeJS.Timeout | null = null
      ; (async () => {
        try {
          const authRes = await fetch('/api/auth/me', { credentials: 'same-origin' })
          if (authRes.ok) {
            setIsAuthenticated(true)
            await fetchProjects()
            id = setInterval(fetchProjects, pollIntervalMs)
          } else {
            setIsAuthenticated(false)
            setProjects([])
          }
        } catch (e) {
          setIsAuthenticated(false)
        }
      })()

    return () => {
      if (id) clearInterval(id)
    }
  }, [fetchProjects, pollIntervalMs])

  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "projects"
    | "project-detail"
    | "project-management"
    | "inventory-management"
    | "new-assessment"
    | "inventory"
    | "run-results"
    | "scenario"
    | "results"
    | "comparison"
    | "reports"
    | "agents"
    | "settings"
    | "help"
  >("dashboard")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const addProject = useCallback(async (project: Project) => {
    // POST to API to persist
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: project.name, description: (project as any).description || null }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const data = await res.json()
      const created = data.project
      setProjects((prev) => [
        ...prev,
        {
          id: String(created.id),
          name: created.name,
          metal: created.metal || '',
          region: created.region || '',
          status: created.status || 'draft',
          gwp: created.gwp || 0,
          recycledContent: created.recycledContent || 0,
          functionalUnit: created.functionalUnit || '1 tonne',
          scenarios: created.scenarios || [],
          createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        },
      ])
    } catch (e) {
      // fallback: optimistic update
      setProjects((prev) => [...prev, project])
    }
  }, [])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    // We keep this local; server update endpoints can be added later.
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const addScenario = useCallback((projectId: string, scenario: Scenario) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            scenarios: [...p.scenarios, scenario],
          }
        }
        return p
      }),
    )
  }, [])

  const updateScenario = useCallback(
    (projectId: string, scenarioId: string, updates: Partial<Scenario>) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              scenarios: p.scenarios.map((s) => (s.id === scenarioId ? { ...s, ...updates } : s)),
            }
          }
          return p
        }),
      )

      if (currentScenario?.id === scenarioId) {
        setCurrentScenario((prev) => (prev ? { ...prev, ...updates } : null))
      }
    },
    [currentScenario],
  )

  const updateStageParameter = useCallback(
    (projectId: string, scenarioId: string, stageId: string, param: Parameter) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              scenarios: p.scenarios.map((s) => {
                if (s.id === scenarioId) {
                  return {
                    ...s,
                    stages: s.stages.map((stage) => {
                      if (stage.id === stageId) {
                        return {
                          ...stage,
                          parameters: [...stage.parameters.filter((p) => p.name !== param.name), param],
                        }
                      }
                      return stage
                    }),
                  }
                }
                return s
              }),
            }
          }
          return p
        }),
      )
    },
    [],
  )

  const runAssessment = useCallback(
    (projectId: string, scenarioId: string) => {
      const results = {
        gwp: Math.random() * 12 + 5,
        energy: Math.random() * 500 + 800,
        water: Math.random() * 5 + 8,
        waste: Math.random() * 3 + 1,
        recycledContent: Math.random() * 40 + 30,
        recoveryRate: Math.random() * 30 + 60,
      }

      updateScenario(projectId, scenarioId, { results })
    },
    [updateScenario],
  )

  const value = useMemo(
    () => ({
      projects,
      setProjects,
      currentProject,
      setCurrentProject,
      currentScenario,
      setCurrentScenario,
      currentView,
      setCurrentView,
      isAuthenticated,
      addProject,
      updateProject,
      addScenario,
      updateScenario,
      updateStageParameter,
      runAssessment,
      setIsAuthenticated,
    }),
    [
      projects,
      setProjects,
      currentProject,
      setCurrentProject,
      currentScenario,
      setCurrentScenario,
      currentView,
      setCurrentView,
      isAuthenticated,
      addProject,
      updateProject,
      addScenario,
      updateScenario,
      updateStageParameter,
      runAssessment,
    ],
  )

  return <LCAContext.Provider value={value}>{children}</LCAContext.Provider>
}

export function useLCA() {
  const context = useContext(LCAContext)
  if (!context) {
    throw new Error("useLCA must be used within LCAProvider")
  }
  return context
}
