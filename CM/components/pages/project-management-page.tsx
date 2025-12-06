"use client"

import { useState } from "react"
import { 
  Plus, Trash2, Edit, Search, Folder, 
  ArrowLeft, Loader2, Eye, MoreVertical, 
  RefreshCw, AlertCircle, Calendar, Package,
  Play, BarChart3, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ProjectManagementPageProps {
  onSelectProject: (projectId: string) => void
  onCreateInventory: (projectId: string) => void
  onViewRuns: (projectId: string) => void
  onBack: () => void
}

interface ProjectRecord {
  id: string
  name: string
  description?: string
  material: string
  process_type: string
  location: string
  inventories: string[]
  runs: string[]
  created_at: string
  updated_at: string
}

const MATERIALS = [
  "Aluminum",
  "Steel", 
  "Copper",
  "Zinc",
  "Titanium",
  "Nickel",
  "Lead",
  "Magnesium",
  "Other",
]

const PROCESS_TYPES = [
  { value: "primary", label: "Primary Production" },
  { value: "secondary", label: "Secondary (Recycling)" },
  { value: "hybrid", label: "Hybrid Process" },
]

const REGIONS = [
  "Europe",
  "North America",
  "Asia Pacific",
  "South America",
  "Middle East",
  "Africa",
  "Global Average",
]

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

export default function ProjectManagementPage({
  onSelectProject,
  onCreateInventory,
  onViewRuns,
  onBack,
}: ProjectManagementPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    material: "Aluminum",
    process_type: "primary",
    location: "Europe",
  })
  
  const queryClient = useQueryClient()

  // Fetch projects
  const { 
    data: projectsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/projects`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      return response.json()
    },
  })

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to create project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setCreateDialogOpen(false)
      resetForm()
    },
  })

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update project")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setEditDialogOpen(false)
      setSelectedProject(null)
      resetForm()
    },
  })

  // Delete project mutation
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
      setDeleteDialogOpen(false)
      setSelectedProject(null)
    },
  })

  const projects: ProjectRecord[] = projectsData?.projects || []
  
  // Filter projects based on search
  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.material.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      material: "Aluminum",
      process_type: "primary",
      location: "Europe",
    })
  }

  const handleCreateClick = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleEditClick = (project: ProjectRecord) => {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      description: project.description || "",
      material: project.material,
      process_type: project.process_type,
      location: project.location,
    })
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (project: ProjectRecord) => {
    setSelectedProject(project)
    setDeleteDialogOpen(true)
  }

  const handleCreate = () => {
    if (!formData.name.trim()) {
      alert("Please enter a project name")
      return
    }
    createMutation.mutate(formData)
  }

  const handleUpdate = () => {
    if (!selectedProject || !formData.name.trim()) return
    updateMutation.mutate({ id: selectedProject.id, data: formData })
  }

  const confirmDelete = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (project: ProjectRecord) => {
    if (project.runs.length === 0) return "secondary"
    return "default"
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Folder className="w-8 h-8 text-primary" />
              Project Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Organize your LCA assessments into projects
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Search and Stats */}
        <Card className="p-4 bg-card border-border mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by name, material, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredProjects.length} projects
            </Badge>
          </div>
        </Card>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading projects...</span>
          </div>
        ) : error ? (
          <Card className="p-16">
            <div className="flex flex-col items-center justify-center text-destructive">
              <AlertCircle className="w-12 h-12 mb-3" />
              <p className="font-medium">Failed to load projects</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure the backend server is running
              </p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-16">
            <div className="flex flex-col items-center justify-center">
              <Folder className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No projects found</p>
              <p className="text-muted-foreground mt-1">
                {searchQuery 
                  ? "Try adjusting your search criteria"
                  : "Create your first project to get started"
                }
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateClick} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Project
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => onSelectProject(project.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.material}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onSelectProject(project.id)
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onCreateInventory(project.id)
                        }}>
                          <Package className="w-4 h-4 mr-2" />
                          Add Inventory
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onViewRuns(project.id)
                        }}>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Runs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleEditClick(project)
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(project)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">{project.process_type}</Badge>
                    <Badge variant="outline">{project.location}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {project.inventories?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Inventories</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {project.runs?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Runs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Created {formatDate(project.created_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Project Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new LCA project to organize your assessments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Aluminum Can Production 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this project..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Select
                    value={formData.material}
                    onValueChange={(v) => setFormData({ ...formData, material: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((mat) => (
                        <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Process Type</Label>
                  <Select
                    value={formData.process_type}
                    onValueChange={(v) => setFormData({ ...formData, process_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESS_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  value={formData.location}
                  onValueChange={(v) => setFormData({ ...formData, location: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Select
                    value={formData.material}
                    onValueChange={(v) => setFormData({ ...formData, material: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((mat) => (
                        <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Process Type</Label>
                  <Select
                    value={formData.process_type}
                    onValueChange={(v) => setFormData({ ...formData, process_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESS_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  value={formData.location}
                  onValueChange={(v) => setFormData({ ...formData, location: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedProject?.name}&quot;? 
                This will also delete all associated inventories and runs.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
