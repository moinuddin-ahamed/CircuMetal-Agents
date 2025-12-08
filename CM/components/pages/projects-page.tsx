"use client"

import { useState } from "react"
import { Search, Plus, Folder, MoreVertical, Edit, Trash2, Loader2, Calendar, MapPin, Layers } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Project } from "@/lib/lca-context"

interface ProjectsPageProps {
  projects: Project[] // Keeping this for compatibility but will use fetched data
  onSelectProject: (project: Project) => void
  onNavigate: (view: any) => void
}

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

export default function ProjectsPage({ projects: initialProjects, onSelectProject, onNavigate }: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    metal: "Steel",
    region: "Europe",
    status: "in-progress"
  })

  const queryClient = useQueryClient()

  // Fetch projects
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      return response.json()
    }
  })

  const projects = projectsData?.projects || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newProject: any) => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      })
      if (!response.ok) throw new Error("Failed to create project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch(`${API_URL}/api/projects/${project.id || project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      })
      if (!response.ok) throw new Error("Failed to update project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  const handleSubmit = () => {
    if (editingProject) {
      updateMutation.mutate({ ...formData, id: editingProject.id || editingProject._id })
    } else {
      createMutation.mutate({
        ...formData,
        created_at: new Date().toISOString(),
        scenarios: []
      })
    }
  }

  const handleEdit = (project: any) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || "",
      metal: project.metal || "Steel",
      region: project.region || "Europe",
      status: project.status || "in-progress"
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate(projectId)
    }
  }

  const resetForm = () => {
    setEditingProject(null)
    setFormData({
      name: "",
      description: "",
      metal: "Steel",
      region: "Europe",
      status: "in-progress"
    })
  }

  const filteredProjects = projects.filter((project: any) => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full p-8 space-y-6 overflow-auto bg-gradient-to-br from-white via-emerald-50/20 to-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Folder className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h1>
            <p className="text-slate-500 mt-1 font-medium">Manage your LCA projects</p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true) }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project: any) => (
            <Card key={project.id || project._id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    {project.name}
                    <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {project.status}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelectProject(project)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(project)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(project.id || project._id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Layers className="w-4 h-4 text-slate-400" />
                    {project.metal}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {project.region}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 col-span-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Created {project.created_at ? new Date(project.created_at).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => onSelectProject(project)}
                >
                  Open Project
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Update project details." : "Add a new LCA project to your workspace."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Steel Plant Alpha"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Project description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metal Type</Label>
                <Input 
                  value={formData.metal} 
                  onChange={(e) => setFormData({...formData, metal: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input 
                  value={formData.region} 
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingProject ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
