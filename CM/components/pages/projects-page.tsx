"use client"

import { useState } from "react"
import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Project } from "@/lib/lca-context"

interface ProjectsPageProps {
  projects: Project[]
  onSelectProject: (project: Project) => void
  onNavigate: (view: any) => void
}

export default function ProjectsPage({ projects, onSelectProject, onNavigate }: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    metalType: "",
    region: "",
    status: "",
    timeRange: "",
  })

  const filteredProjects = projects.filter((project) => {
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filters.metalType && !project.metal.toLowerCase().includes(filters.metalType)) return false
    if (filters.region && !project.region.toLowerCase().includes(filters.region)) return false
    if (filters.status && project.status !== filters.status) return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-500/30"
      case "in-progress":
        return "bg-blue-500/20 text-blue-700 border-blue-500/30"
      case "draft":
        return "bg-gray-500/20 text-gray-700 border-gray-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">View and manage all your LCA projects</p>
        </div>
        <Button
          onClick={() => onNavigate("new-assessment")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Metal Type</label>
            <select
              value={filters.metalType}
              onChange={(e) => setFilters({ ...filters, metalType: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All metals</option>
              <option value="Aluminium">Aluminium</option>
              <option value="Copper">Copper</option>
              <option value="Nickel">Nickel</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Region</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All regions</option>
              <option value="Europe">Europe</option>
              <option value="Asia-Pacific">Asia-Pacific</option>
              <option value="North America">North America</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Results</label>
            <div className="text-sm font-medium text-foreground mt-2">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Project Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Metal</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Region</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Created</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Circularity Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project)
                    onNavigate("project-detail")
                  }}
                  className="border-b border-border hover:bg-card/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-foreground">{project.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{project.metal}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{project.region}</td>
                  <td className="py-3 px-4">
                    <Badge className={`${getStatusColor(project.status)} border`}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{project.createdAt.toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">-</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <p className="text-muted-foreground">No projects match your search criteria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
