"use client"
import { Plus, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ProjectCard from "@/components/dashboard/project-card"
import KeyInsights from "@/components/dashboard/key-insights"
import SummaryMetrics from "@/components/dashboard/summary-metrics"
import type { Project } from "@/lib/lca-context"

interface DashboardProps {
  projects: Project[]
  onNavigate: (view: any) => void
  onSelectProject: (project: Project) => void
}

export default function Dashboard({ projects, onNavigate, onSelectProject }: DashboardProps) {
  const projectsWithMissingData = projects.filter((p) => p.gwp === 0 && p.recycledContent === 0)

  return (
    <div className="h-full p-8 space-y-8 overflow-auto bg-gradient-to-br from-white via-emerald-50/20 to-white">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Overview of all metal LCA assessments</p>
        </div>
        <Button
          onClick={() => onNavigate("new-assessment")}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white gap-2 shadow-lg shadow-emerald-500/25 rounded-xl px-5 py-2.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/30"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <SummaryMetrics projects={projects} />
      </div>

      {/* Key Insights */}
      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <KeyInsights projects={projects} />
      </div>

      {projectsWithMissingData.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 rounded-xl animate-slide-up" style={{ animationDelay: '300ms' }}>
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 font-medium">
            {projectsWithMissingData.length} project{projectsWithMissingData.length !== 1 ? "s" : ""} have missing
            assessment data. Use AI-assisted parameter prediction to complete them.
          </AlertDescription>
        </Alert>
      )}

      {/* Projects List */}
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Recent Projects</h2>
            <p className="text-sm text-slate-500 mt-1">Latest LCA assessments and scenarios</p>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>{projects.length} total</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length > 0 ? (
            projects.slice(0, 6).map((project, index) => (
              <div key={project.id} className="animate-scale-in" style={{ animationDelay: `${500 + index * 100}ms` }}>
                <ProjectCard
                  project={project}
                  onOpen={() => {
                    onSelectProject(project)
                    onNavigate("projects")
                  }}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-lg text-slate-700 font-semibold">No projects yet</p>
              <p className="text-sm text-slate-500 mt-1">Create your first assessment to get started</p>
              <Button
                onClick={() => onNavigate("new-assessment")}
                className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                Create Assessment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
