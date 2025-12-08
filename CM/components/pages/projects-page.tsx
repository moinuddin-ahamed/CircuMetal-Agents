"use client"

import { useState } from "react"
import { Search, Plus, Folder } from "lucide-react"
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
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "draft":
        return "bg-slate-100 text-slate-600 border-slate-200"
      default:
        return "bg-slate-100 text-slate-500"
    }
  }

  return (
    <div className="h-full p-8 space-y-6 overflow-auto bg-gradient-to-br from-white via-emerald-50/20 to-white">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Folder className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h1>
            <p className="text-slate-500 mt-1 font-medium">View and manage all your LCA projects</p>
          </div>
        </div>
        <Button
          onClick={() => onNavigate("new-assessment")}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white gap-2 shadow-lg shadow-emerald-500/25 rounded-xl px-5 transition-all duration-300 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 animate-slide-up bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" style={{ animationDelay: '100ms' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-slate-50 border-slate-100 rounded-xl focus:border-emerald-300 focus:ring-emerald-100 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Metal Type</label>
            <select
              value={filters.metalType}
              onChange={(e) => setFilters({ ...filters, metalType: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl text-sm hover:border-emerald-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            >
              <option value="">All metals</option>
              <option value="Aluminium">Aluminium</option>
              <option value="Copper">Copper</option>
              <option value="Nickel">Nickel</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Region</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl text-sm hover:border-emerald-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            >
              <option value="">All regions</option>
              <option value="Europe">Europe</option>
              <option value="Asia-Pacific">Asia-Pacific</option>
              <option value="North America">North America</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl text-sm hover:border-emerald-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Results</label>
            <div className="text-lg font-bold text-emerald-600 mt-1.5">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name</th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Metal</th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Circularity</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project, index) => (
                <tr
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project)
                    onNavigate("project-detail")
                  }}
                  className="border-b border-slate-50 hover:bg-emerald-50/50 cursor-pointer transition-all duration-200 group"
                  style={{ animationDelay: `${300 + index * 50}ms` }}
                >
                  <td className="py-4 px-5 text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">{project.name}</td>
                  <td className="py-4 px-5 text-sm text-slate-600">{project.metal}</td>
                  <td className="py-4 px-5 text-sm text-slate-600">{project.region}</td>
                  <td className="py-4 px-5">
                    <Badge className={`${getStatusColor(project.status)} border font-medium`}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-4 px-5 text-sm text-slate-500">{project.createdAt.toLocaleDateString()}</td>
                  <td className="py-4 px-5">
                    <span className="text-sm font-semibold text-slate-700">—</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Folder className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No projects match your search criteria</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
