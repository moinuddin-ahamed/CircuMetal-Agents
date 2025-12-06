"use client"
import { Plus, AlertCircle } from "lucide-react"
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
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of all metal LCA assessments</p>
        </div>
        <Button
          onClick={() => onNavigate("new-assessment")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </Button>
      </div>

      {/* Summary Metrics */}
      <SummaryMetrics projects={projects} />

      {/* Key Insights */}
      <KeyInsights projects={projects} />

      {projectsWithMissingData.length > 0 && (
        <Alert className="border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {projectsWithMissingData.length} project{projectsWithMissingData.length !== 1 ? "s" : ""} have missing
            assessment data. Use AI-assisted parameter prediction to complete them.
          </AlertDescription>
        </Alert>
      )}

      {/* Projects List */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Recent Projects</h2>
          <p className="text-sm text-muted-foreground mt-2">Latest LCA assessments and scenarios</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length > 0 ? (
            projects.slice(0, 6).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => {
                  onSelectProject(project)
                  onNavigate("projects")
                }}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <p className="text-lg text-muted-foreground font-medium">No projects yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first assessment to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
